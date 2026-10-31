import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Banknote, Calculator, Landmark, LockKeyhole, ReceiptText, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import KasseneinzaehlModal from '../components/tageskasse/KasseneinzaehlModal';
import KassenabrechnungsModal from '../components/tageskasse/KassenabrechnungsModal';
import TresorzaehlungsModal from '../components/tageskasse/TresorzaehlungsModal';
import EinzahlungsbelegModal from '../components/tageskasse/EinzahlungsbelegModal';
import TagesabschlussV2Modal from '../components/tageskasse/TagesabschlussV2Modal';
import { employeePinApi } from '../lib/employeePinApi';
import { safeCountApi } from '../lib/safeCountApi';
import { berlinBusinessDate, isHistoricalBusinessDate, mayBackfillBusinessDate } from '../lib/businessDate.mjs';
import { tageskasseApi } from '../lib/tageskasseApi';
import { formatEuroCents } from '../lib/einzahlungsbeleg.mjs';
import { resumableDraft } from '../lib/workflowDraft.mjs';
import { useMaintenance } from '../components/MaintenanceProvider.jsx';
import { mayStartCashWorkflow } from '../lib/maintenancePolicy.mjs';

const actions = [
  { id: 'opening-count', label: 'Kasse einzählen', description: 'Lade vor Schichtbeginn zählen und den Anfangsbestand dokumentieren.', icon: Banknote, enabled: true },
  { id: 'closing', label: 'Kasse abrechnen', description: 'Kassenschicht beenden und Schritt für Schritt sicher abrechnen.', icon: Calculator, enabled: true },
  { id: 'safe-count', label: 'Tresorzählung', description: 'Tresorbestand im Vier-Augen-Prinzip zählen und bestätigen.', icon: Landmark, enabled: true },
];

export default function Tageskassenabrechnung() {
  const navigate = useNavigate();
  const { status: maintenanceStatus } = useMaintenance();
  const [openingCountOpen, setOpeningCountOpen] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  const [safeContext, setSafeContext] = useState(null);
  const [safeLoading, setSafeLoading] = useState(false);
  const [receiptClosings, setReceiptClosings] = useState([]);
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [receiptError, setReceiptError] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [dayCloseV2Open, setDayCloseV2Open] = useState(false);
  const [workflowDrafts, setWorkflowDrafts] = useState({});
  const [workflowLoading, setWorkflowLoading] = useState('');
  const user = useMemo(()=>{ try { return JSON.parse(sessionStorage.getItem('user'))||{}; } catch { return {}; } }, []);
  const today = useMemo(()=>berlinBusinessDate(), []);
  const [businessDate, setBusinessDate] = useState(today);
  const mayBackfill = mayBackfillBusinessDate(user.role);
  const isBackfill = isHistoricalBusinessDate(businessDate, today);
  const centralRoles = new Set(['Admin','Supervisor','Geschäftsführer','Manager-1']);
  const branch = centralRoles.has(user.role) ? 'Vreden' : user.filiale;
  const moduleAllowed = Boolean(branch);

  const loadReceiptClosings = async () => {
    if (!moduleAllowed) return;
    setReceiptLoading(true);
    setReceiptError('');
    try {
      const data = await tageskasseApi.openDepositReceipts(branch);
      setReceiptClosings(data.closings || []);
    } catch (error) {
      setReceiptError(error.message);
    } finally {
      setReceiptLoading(false);
    }
  };

  useEffect(() => { loadReceiptClosings(); }, [branch, moduleAllowed]);

  const previousClosingFor = async ({ drawerNumber }) => {
    const result = await tageskasseApi.previousClosing({ branch, businessDate, drawerNumber });
    return result.closing;
  };

  const loadWorkflowDraft = async (workflowType) => {
    const response = await tageskasseApi.loadWorkflowDraft({ branch, businessDate, workflowType });
    const draft = resumableDraft(response.draft);
    setWorkflowDrafts((current)=>({ ...current, [workflowType]: draft }));
    return draft;
  };

  useEffect(() => {
    if (!moduleAllowed) return undefined;
    let active = true;
    const types = ['drawer_opening','drawer_closing','safe_count','day_close'];
    Promise.all(types.map(async (workflowType) => {
      const response = await tageskasseApi.loadWorkflowDraft({ branch, businessDate, workflowType });
      return [workflowType, resumableDraft(response.draft)];
    })).then(async (entries) => {
      if (!active) return;
      const loaded = Object.fromEntries(entries);
      setWorkflowDrafts(loaded);
      const first = types.find((type)=>loaded[type]);
      if (first==='drawer_opening') setOpeningCountOpen(true);
      if (first==='drawer_closing') setClosingOpen(true);
      if (first==='safe_count') {
        setSafeLoading(true);
        try { if (active) setSafeContext(await safeCountApi.context(branch, businessDate)); }
        finally { if (active) setSafeLoading(false); }
      }
      if (first==='day_close') setDayCloseV2Open(true);
    }).catch((error) => { if (active) toast.error(`Entwürfe konnten nicht geprüft werden: ${error.message}`); });
    return () => { active = false; };
  }, [branch, businessDate, moduleAllowed]);

  const draftProps = (workflowType) => ({
    initialDraft: workflowDrafts[workflowType] || null,
    saveDraft: async (payload) => (await tageskasseApi.saveWorkflowDraft({ branch, businessDate, workflowType, ...payload })).draft,
    closeDraft: async (status, expectedRevision) => {
      const response = await tageskasseApi.closeWorkflowDraft({ branch, businessDate, workflowType, status, expectedRevision });
      setWorkflowDrafts((current)=>({ ...current, [workflowType]: null }));
      return response.draft;
    },
  });

  const openAction = async (action) => {
    if (!moduleAllowed) return toast.error('Deinem Benutzer ist keine Filiale zugeordnet.');
    const workflowType = action.id==='opening-count' ? 'drawer_opening' : action.id==='closing' ? 'drawer_closing' : 'safe_count';
    if (!mayStartCashWorkflow(maintenanceStatus, workflowDrafts[workflowType])) {
      return toast.error('Wartung wird vorbereitet. Es kann kein neuer Kassenprozess begonnen werden.');
    }
    if (action.id==='opening-count') {
      setWorkflowLoading('drawer_opening');
      try { await loadWorkflowDraft('drawer_opening'); setOpeningCountOpen(true); }
      catch (error) { toast.error(error.message); }
      finally { setWorkflowLoading(''); }
      return;
    }
    if (action.id==='closing') {
      setWorkflowLoading('drawer_closing');
      try { await loadWorkflowDraft('drawer_closing'); setClosingOpen(true); }
      catch (error) { toast.error(error.message); }
      finally { setWorkflowLoading(''); }
      return;
    }
    if (action.id==='safe-count') {
      setWorkflowLoading('safe_count');
      setSafeLoading(true);
      try {
        const [context] = await Promise.all([safeCountApi.context(branch, businessDate), loadWorkflowDraft('safe_count')]);
        setSafeContext(context);
      }
      catch (error) { toast.error(error.message); }
      finally { setSafeLoading(false); setWorkflowLoading(''); }
    }
  };

  const openDayClose = async () => {
    if (!mayStartCashWorkflow(maintenanceStatus, workflowDrafts.day_close)) {
      return toast.error('Wartung wird vorbereitet. Es kann kein neuer Tagesabschluss begonnen werden.');
    }
    setWorkflowLoading('day_close');
    try { await loadWorkflowDraft('day_close'); setDayCloseV2Open(true); }
    catch (error) { toast.error(error.message); }
    finally { setWorkflowLoading(''); }
  };

  return <main className="min-h-screen min-h-dvh bg-[#353232] text-white">
    <header className="bg-[#800000] shadow-xl"><div className="mx-auto flex min-h-16 max-w-[1400px] items-center justify-between gap-3 px-3 sm:px-6 lg:px-10">
      <button type="button" onClick={()=>navigate('/start')} className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-black hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ArrowLeft size={20}/>Startseite</button>
      <div className="text-right"><div className="text-xs font-bold uppercase tracking-[.18em] text-white/65">Filialprozess</div><h1 className="text-base font-black sm:text-xl">Tageskassenabrechnung</h1></div>
    </div></header>

    <div className="mx-auto max-w-[1300px] p-3 sm:p-6 lg:p-10">
      <section className="rounded-3xl bg-gradient-to-br from-[#4a4747] to-[#302e2e] p-5 shadow-2xl sm:p-8">
        <div className="max-w-3xl"><div className="text-xs font-bold uppercase tracking-[.24em] text-amber-300/80">{branch}</div><h2 className="mt-2 text-3xl font-black sm:text-5xl">Was möchtest du erledigen?</h2><p className="mt-3 text-white/60 sm:text-lg">Jeder Vorgang wird eindeutig einer Person, einer Lade und einem Zeitpunkt zugeordnet.</p></div>
        {mayBackfill&&<div className={`mt-6 rounded-2xl border p-4 sm:flex sm:items-end sm:justify-between sm:gap-6 ${isBackfill?'border-amber-300 bg-amber-300/15':'border-white/15 bg-black/10'}`}>
          <div><div className="text-xs font-black uppercase tracking-[.18em] text-amber-200">Nur Admin und Supervisor</div><h3 className="mt-1 text-xl font-black">Geschäftstag für Nacherfassung</h3><p className="mt-1 text-sm text-white/65">Das ausgewählte Datum gilt verbindlich für alle Vorgänge, bis du das Modul verlässt.</p></div>
          <label className="mt-4 block shrink-0 text-sm font-bold sm:mt-0">Geschäftstag
            <input type="date" max={today} value={businessDate} onChange={(event)=>setBusinessDate(event.target.value||today)} className="mt-2 block min-h-12 rounded-xl border border-white/20 bg-white px-4 text-lg font-black text-black" />
          </label>
        </div>}
        {isBackfill&&<div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-300/15 p-4 font-black text-amber-100">Nacherfassung aktiv · Geschäftstag {new Date(`${businessDate}T12:00:00`).toLocaleDateString('de-DE')}</div>}
        <div className="mt-8 grid gap-4 lg:grid-cols-3">{actions.map((action)=>{const Icon=action.icon;const workflowType=action.id==='opening-count'?'drawer_opening':action.id==='closing'?'drawer_closing':'safe_count';const enabled=action.enabled&&moduleAllowed&&mayStartCashWorkflow(maintenanceStatus,workflowDrafts[workflowType]);return <button key={action.id} type="button" disabled={!enabled||(safeLoading&&action.id==='safe-count')} onClick={()=>openAction(action)} className={`relative min-h-56 rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:p-6 ${enabled?'border-amber-300/35 bg-white/[.09] hover:-translate-y-1 hover:bg-white/[.13]':'border-white/10 bg-white/[.04] text-white/55'} disabled:opacity-50`}>
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${enabled?'bg-amber-400 text-[#5b170c]':'bg-white/10'}`}><Icon size={30}/></span><h3 className="mt-5 text-2xl font-black">{action.label}</h3><p className="mt-2 leading-relaxed text-white/60">{action.description}</p><div className={`mt-5 flex items-center gap-2 text-sm font-bold ${enabled?'text-amber-200':'text-white/35'}`}>{enabled?<><ShieldCheck size={17}/>{workflowLoading&&((action.id==='opening-count'&&workflowLoading==='drawer_opening')||(action.id==='closing'&&workflowLoading==='drawer_closing')||(action.id==='safe-count'&&workflowLoading==='safe_count'))?'Entwurf wird geprüft …':workflowDrafts[workflowType]?'Angefangenen Vorgang fortsetzen':'Jetzt starten'}</>:<><LockKeyhole size={17}/>{maintenanceStatus.mode==='open'?'Während DEV nicht freigeschaltet':'Wartung: kein neuer Vorgang'}</>}</div>
        </button>})}</div>
        <button type="button" disabled={workflowLoading==='day_close'||!mayStartCashWorkflow(maintenanceStatus,workflowDrafts.day_close)} onClick={openDayClose} className="mt-6 min-h-12 w-full rounded-2xl border-2 border-emerald-300/40 bg-emerald-400/15 px-5 font-black text-emerald-100 hover:bg-emerald-400/20 disabled:opacity-50">{workflowLoading==='day_close'?'Entwurf wird geprüft …':workflowDrafts.day_close?'Angefangenen Tagesabschluss fortsetzen':maintenanceStatus.mode==='open'?'Tagesabrechnung abschließen':'Wartung: kein neuer Tagesabschluss'}</button>
      </section>

      <section className="mt-6 rounded-3xl bg-gradient-to-br from-[#4a4747] to-[#302e2e] p-5 shadow-2xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><div className="text-xs font-black uppercase tracking-[.2em] text-amber-300">Noch nicht archiviert</div><h2 className="mt-1 text-2xl font-black sm:text-3xl">Einzahlungsbelege fehlen</h2></div>
          {!!receiptClosings.length && <button type="button" onClick={()=>setReceiptOpen(true)} className="flex min-h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 font-black text-[#4b1800]"><ReceiptText/>Beleg erfassen</button>}
        </div>
        {receiptLoading && <div className="mt-5 rounded-2xl border border-white/10 p-5 text-white/65">Offene Tagesabschlüsse werden geladen …</div>}
        {!receiptLoading && receiptError && <div className="mt-5 rounded-2xl border border-red-300/30 bg-red-400/10 p-5 text-red-100">{receiptError}</div>}
        {!receiptLoading && !receiptError && !receiptClosings.length && <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-5 text-center text-white/55">Aktuell fehlt kein Einzahlungsbeleg.</div>}
        {!receiptLoading && !receiptError && !!receiptClosings.length && <div className="mt-5 grid gap-3 md:grid-cols-2">
          {receiptClosings.map((closing)=><button type="button" key={closing.id} onClick={()=>setReceiptOpen(true)} className="rounded-2xl border border-amber-300/30 bg-white/[.07] p-5 text-left hover:bg-white/[.11]">
            <strong className="block text-xl">Geschäftstag {new Date(`${closing.businessDate}T12:00:00`).toLocaleDateString('de-DE')}</strong>
            <span className="mt-2 block text-lg font-black text-amber-200">{formatEuroCents(closing.expectedDepositCents)} an Bank</span>
            <span className="mt-3 block text-sm font-bold text-white/55">Einzahlungsbeleg erfassen →</span>
          </button>)}
        </div>}
      </section>
    </div>

    {openingCountOpen&&<KasseneinzaehlModal {...draftProps('drawer_opening')} branch={branch} businessDate={businessDate} onClose={()=>setOpeningCountOpen(false)} verifyPin={(pin,options)=>employeePinApi.verify(pin,options)} loadFirstUseCandidates={()=>employeePinApi.firstUseCandidates()} activatePin={(payload)=>employeePinApi.activate(payload)} previousClosingFor={previousClosingFor} onComplete={(payload)=>tageskasseApi.saveOpening(payload)}/>}
    {closingOpen&&<KassenabrechnungsModal
      {...draftProps('drawer_closing')}
      branch={branch}
      businessDate={businessDate}
      onClose={()=>setClosingOpen(false)}
      verifyPin={(pin,options)=>employeePinApi.verify(pin,options)}
      loadEmployees={()=>employeePinApi.cashCandidates(branch)}
      loadContext={({drawerNumber})=>tageskasseApi.closingContext({branch,businessDate,drawerNumber})}
      onComplete={(payload)=>tageskasseApi.saveClosing({branch,...payload})}
    />}
    {safeContext&&<TresorzaehlungsModal {...draftProps('safe_count')} branch={branch} context={safeContext} onClose={()=>setSafeContext(null)} onComplete={(payload)=>safeCountApi.complete(payload)}/>}
    {receiptOpen&&<EinzahlungsbelegModal
      branch={branch}
      closings={receiptClosings}
      onClose={()=>setReceiptOpen(false)}
      onConfirm={async(payload)=>{
        const result=await tageskasseApi.confirmDepositReceipt(payload);
        await loadReceiptClosings();
        return result;
      }}
    />}
    {dayCloseV2Open&&<TagesabschlussV2Modal
      {...draftProps('day_close')}
      branch={branch}
      businessDate={businessDate}
      loadContext={()=>tageskasseApi.dayCloseContext({branch,businessDate})}
      verifyPin={(pin,options)=>employeePinApi.verify(pin,options)}
      saveDailyMetrics={(metrics)=>tageskasseApi.saveDailyMetrics({branch,businessDate,...metrics})}
      saveSafeCount={async(payload)=>(await tageskasseApi.saveFinalSafeCount({branch,businessDate,...payload})).count}
      finalizeDay={(payload)=>tageskasseApi.finalizeDay({branch,businessDate,...payload})}
      onStartProcess={(process)=>toast(`${process.title} wird im nächsten Schritt angeschlossen.`,{icon:'🧩'})}
      onStartLegacy={()=>toast('Der bisherige Tagesabschluss bleibt unverändert verfügbar.',{icon:'↩️'})}
      onClose={()=>setDayCloseV2Open(false)}
    />}
  </main>;
}
