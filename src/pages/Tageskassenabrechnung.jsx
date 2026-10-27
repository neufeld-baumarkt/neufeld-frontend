import {
  ArrowLeft,
  Banknote,
  Calculator,
  Landmark,
  LockKeyhole,
  MapPin,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import KasseneinzaehlModal from '../components/tageskasse/KasseneinzaehlModal';
import KassenabrechnungsModal from '../components/tageskasse/KassenabrechnungsModal';
import KassenabrechnungsArchiv from '../components/tageskasse/KassenabrechnungsArchiv';
import TresorzaehlungsModal from '../components/tageskasse/TresorzaehlungsModal';
import TagesabschlussModal from '../components/tageskasse/TagesabschlussModal';
import TagesabschlussV2Modal from '../components/tageskasse/TagesabschlussV2Modal';
import EinzahlungsbelegModal from '../components/tageskasse/EinzahlungsbelegModal';
import { employeePinApi } from '../lib/employeePinApi';
import { kasseneinzaehlungApi } from '../lib/kasseneinzaehlungApi';
import { kassenabrechnungApi } from '../lib/kassenabrechnungApi';
import { canUseCashModule, needsTemporaryCashBranch } from '../lib/cashModuleAccess.mjs';
import { berlinBusinessDate, canSelectHistoricalBusinessDate, formatBusinessDate, setActiveCashBusinessDate } from '../lib/cashBusinessDate.mjs';
import { formatEuroCents } from '../lib/einzahlungsbeleg.mjs';

const processes = [
  {
    id: 'opening-count',
    label: 'Kasse einzählen',
    description: 'Eine Kassenlade sicher auf den verbindlichen Bestand von 250,00 € vorbereiten.',
    icon: Banknote,
    enabled: true,
  },
  {
    id: 'closing',
    label: 'Kasse abrechnen',
    description: 'Stückelungen erfassen, Einnahmen berechnen und die Übergabe an EuroControl vorbereiten.',
    icon: Calculator,
    enabled: true,
  },
  {
    id: 'safe-count',
    label: 'Tresorzählung',
    description: 'Den tatsächlichen Tresorbestand im Vier-Augen-Prinzip zählen und dokumentieren.',
    icon: Landmark,
    enabled: true,
  },
];

export default function Tageskassenabrechnung() {
  const navigate = useNavigate();
  const [openingCountOpen, setOpeningCountOpen] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  const [closingPreset, setClosingPreset] = useState(null);
  const [safeCountOpen, setSafeCountOpen] = useState(false);
  const [safeCountMode, setSafeCountMode] = useState({ initialType:'', forceNewClosing:false });
  const [dayCloseOpen, setDayCloseOpen] = useState(false);
  const [dayCloseV2Open, setDayCloseV2Open] = useState(false);
  const [safeRefreshKey, setSafeRefreshKey] = useState(0);
  const [archiveRefreshKey, setArchiveRefreshKey] = useState(0);
  const [receiptClosings, setReceiptClosings] = useState([]);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeOpenings, setActiveOpenings] = useState([]);
  const [businessDayStatus, setBusinessDayStatus] = useState('open');
  const [branches, setBranches] = useState([]);
  const user = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('user')) || {}; } catch { return {}; }
  }, []);
  const currentBusinessDate = useMemo(() => berlinBusinessDate(), []);
  const [selectedBusinessDate, setSelectedBusinessDate] = useState(currentBusinessDate);
  const assignedBranch = String(user.filiale || '').trim();
  const requiresBranchChoice = needsTemporaryCashBranch(user);
  const [branch, setBranch] = useState(requiresBranchChoice ? '' : assignedBranch);
  const canBackdate = canSelectHistoricalBusinessDate(user.role);
  const canPreviewDayCloseV2 = ['Admin','Supervisor'].includes(user.role);
  const displayedBusinessDate = formatBusinessDate(selectedBusinessDate);
  const historicalMode = selectedBusinessDate !== currentBusinessDate;

  useEffect(() => {
    setActiveCashBusinessDate(selectedBusinessDate);
    setArchiveRefreshKey((current) => current + 1);
    return () => setActiveCashBusinessDate('');
  }, [selectedBusinessDate]);

  useEffect(() => {
    if (!requiresBranchChoice) return;
    kasseneinzaehlungApi.branches()
      .then(setBranches)
      .catch((error) => toast.error(error.message));
  }, [requiresBranchChoice]);

  const loadReceiptClosings = async () => {
    if (!branch || branch.toLowerCase() === 'alle') return;
    setReceiptLoading(true);
    setReceiptError('');
    try {
      const payload = await kassenabrechnungApi.openDepositReceipts(branch);
      setReceiptClosings(payload.closings || []);
    } catch (error) {
      setReceiptError(error.message);
    } finally {
      setReceiptLoading(false);
    }
  };

  useEffect(() => { loadReceiptClosings(); }, [branch, archiveRefreshKey]);

  if (!canUseCashModule(user)) return <Navigate to="/forbidden" replace />;

  const openProcess = (process) => {
    if (!process.enabled) return toast('Dieser Prozess wird erst nach der gemeinsamen fachlichen Festlegung freigeschaltet.', { icon: '🔒' });
    if (!branch || branch.toLowerCase() === 'alle') return toast.error('Bitte zuerst eine Filiale für diesen Kassenvorgang auswählen.');
    if (businessDayStatus === 'finalized') return toast.error('Dieser Geschäftstag ist bereits vollständig abgeschlossen und Read-only.');
    if (process.id === 'opening-count') return setOpeningCountOpen(true);
    if (process.id === 'closing') { setClosingPreset(null); return setClosingOpen(true); }
    if (process.id === 'safe-count') { setSafeCountMode({initialType:'',forceNewClosing:false}); return setSafeCountOpen(true); }
  };

  return (
    <main className="min-h-screen min-h-dvh bg-[#353232] text-white">
      <header className="bg-[#800000] shadow-xl">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-4 px-3 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => navigate('/start')}
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-black hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            <span>Startseite</span>
          </button>

          <div className="hidden items-center gap-3 text-right sm:flex">
            <img
              src="/Icons/tageskassenabrechnung.png"
              alt=""
              className="h-11 w-11 rounded-full object-cover"
            />
            <div>
              <div className="text-xs font-bold uppercase tracking-[.18em] text-white/65">Filialprozess</div>
              <div className="font-black">Tageskassenabrechnung</div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1300px] p-3 sm:p-6 lg:p-10">
        <section className="rounded-3xl bg-gradient-to-br from-[#4a4747] to-[#302e2e] p-5 shadow-2xl sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-[.24em] text-amber-300/80">{branch && branch.toLowerCase() !== 'alle' ? branch : 'Tageskassenabrechnung'}</div>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">Was möchtest du erledigen?</h1>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 sm:text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-white/40">Geschäftstag</div>
              <div className="mt-1 font-black capitalize">{displayedBusinessDate}</div>
              {canBackdate&&<label className="mt-3 block text-left text-xs font-bold text-white/65 sm:text-right">
                Nacherfassungsdatum
                <input
                  type="date"
                  value={selectedBusinessDate}
                  max={currentBusinessDate}
                  onChange={(event)=>{setOpeningCountOpen(false);setClosingOpen(false);setSafeCountOpen(false);setDayCloseOpen(false);setActiveOpenings([]);setBusinessDayStatus('open');setSelectedBusinessDate(event.target.value||currentBusinessDate);}}
                  className="mt-1 block min-h-11 w-full rounded-xl border border-white/20 bg-white px-3 font-bold text-[#242121]"
                />
              </label>}
            </div>
          </div>
          {historicalMode&&<div className="mt-5 rounded-2xl border-2 border-amber-300 bg-amber-300/15 p-4 font-bold text-amber-100">
            Nacherfassungsmodus: Alle Vorgänge werden verbindlich dem Geschäftstag {displayedBusinessDate} zugeordnet. Der Modus endet automatisch beim Verlassen dieser Seite.
          </div>}

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {processes.map((process) => {
              const Icon = process.icon;
              return (
                <button
                  type="button"
                  onClick={() => openProcess(process)}
                  key={process.label}
                  className={`relative min-h-56 overflow-hidden rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:p-6 ${process.enabled ? 'border-amber-300/30 bg-white/[.09] hover:-translate-y-1 hover:bg-white/[.13]' : 'border-white/10 bg-white/[.07] text-white/60'}`}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-[#5b170c] shadow-lg shadow-amber-900/20">
                    <Icon size={30} strokeWidth={2.25} aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-2xl font-black">{process.label}</h2>
                  <p className="mt-2 leading-relaxed text-white/60">{process.description}</p>
                  <div className={`mt-5 flex items-center gap-2 text-sm font-bold ${process.enabled ? 'text-amber-200' : 'text-amber-200/70'}`}>
                    {process.enabled ? <ShieldCheck size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
                    {process.enabled ? 'Jetzt starten' : 'Wird im nächsten Schritt freigeschaltet'}
                  </div>
                </button>
              );
            })}
          </div>

          {canPreviewDayCloseV2&&branch&&branch.toLowerCase()!=='alle'&&<div className="mt-6 rounded-2xl border-2 border-emerald-300/35 bg-emerald-400/10 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div><div className="text-xs font-black uppercase tracking-[.18em] text-emerald-200">Admin-/Supervisor-Vorschau</div><strong className="mt-1 block text-xl">Modularen Tagesabschluss testen</strong><p className="mt-1 text-sm text-white/60">Reine Fantasiewerte · keine Speicherung · der bisherige Ablauf bleibt unverändert.</p></div>
            <button type="button" onClick={()=>setDayCloseV2Open(true)} className="mt-4 min-h-12 shrink-0 rounded-xl bg-emerald-600 px-5 font-black text-white hover:bg-emerald-500 sm:mt-0">Tagesabrechnung V2 starten</button>
          </div>}

          {branch&&branch.toLowerCase()!=='alle'&&<KassenabrechnungsArchiv branch={branch} refreshKey={archiveRefreshKey} verifyPin={(pin,options)=>kasseneinzaehlungApi.verifyPin(pin,{...options,branch})} onOverviewChange={(payload)=>{setActiveOpenings((payload.openings||[]).filter((item)=>item.lifecycleStatus==='active'));setBusinessDayStatus(payload.businessDayStatus||'open');}} onCloseOpening={(opening)=>{setClosingPreset(opening);setClosingOpen(true);}} onStartDayClose={()=>setDayCloseOpen(true)}/>}
          {branch&&branch.toLowerCase()!=='alle'&&<section className="mt-7 rounded-3xl border border-amber-300/20 bg-white/[.06] p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><div className="text-xs font-black uppercase tracking-[.2em] text-amber-300/75">Noch nicht archiviert</div><h2 className="mt-1 text-2xl font-black">Einzahlungsbelege fehlen</h2></div>
              {!!receiptClosings.length&&<button type="button" onClick={()=>setReceiptOpen(true)} className="flex min-h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 font-black text-[#4b1800]"><ReceiptText/>Beleg erfassen</button>}
            </div>
            {receiptLoading&&<div className="mt-5 rounded-2xl border border-white/10 p-5 text-white/65">Offene Tagesabschlüsse werden geladen …</div>}
            {!receiptLoading&&receiptError&&<div className="mt-5 rounded-2xl border border-red-300/30 bg-red-400/10 p-5 text-red-100">{receiptError}</div>}
            {!receiptLoading&&!receiptError&&!receiptClosings.length&&<div className="mt-5 rounded-2xl border border-dashed border-white/15 p-5 text-center text-white/55">Aktuell fehlt kein Einzahlungsbeleg.</div>}
            {!receiptLoading&&!receiptError&&!!receiptClosings.length&&<div className="mt-5 grid gap-3 md:grid-cols-2">
              {receiptClosings.map((closing)=><button type="button" key={closing.id} onClick={()=>setReceiptOpen(true)} className="rounded-2xl border border-amber-300/30 bg-white/[.07] p-5 text-left hover:bg-white/[.11]">
                <strong className="block text-xl">Geschäftstag {new Date(`${closing.businessDate}T12:00:00`).toLocaleDateString('de-DE')}</strong>
                <span className="mt-2 block text-lg font-black text-amber-200">{formatEuroCents(closing.expectedDepositCents)} an Bank</span>
                <span className="mt-3 block text-sm font-bold text-white/55">Einzahlungsbeleg erfassen →</span>
              </button>)}
            </div>}
          </section>}
        </section>
      </div>
      {openingCountOpen && (
        <KasseneinzaehlModal
          branch={branch}
          onClose={() => setOpeningCountOpen(false)}
          verifyPin={(pin, options) => kasseneinzaehlungApi.verifyPin(pin, { ...options, branch })}
          loadFirstUseCandidates={() => employeePinApi.firstUseCandidates({ branch })}
          activatePin={(payload) => employeePinApi.activate(payload, { branch })}
          previousClosingFor={({ drawerNumber }) => kasseneinzaehlungApi.previousClosing(drawerNumber, branch)}
          activeOpenings={activeOpenings}
          onComplete={async(payload)=>{const saved=await kasseneinzaehlungApi.saveOpeningCount(payload,branch);setArchiveRefreshKey((current)=>current+1);return saved;}}
        />
      )}
      {closingOpen && (
        <KassenabrechnungsModal
          branch={branch}
          presetOpening={closingPreset}
          onClose={() => {setClosingOpen(false);setClosingPreset(null);}}
          verifyPin={(pin, options) => kasseneinzaehlungApi.verifyPin(pin, { ...options, branch })}
          loadEmployees={() => kassenabrechnungApi.employees(branch)}
          loadContext={({ drawerNumber, employee, responsibleEmployee }) => kassenabrechnungApi.closingContext({ drawerNumber, proofToken: employee.proofToken, responsibleEmployeeId: responsibleEmployee.id }, branch)}
          onComplete={async(payload)=>{const saved=await kassenabrechnungApi.saveClosing(payload,branch);setArchiveRefreshKey((current)=>current+1);return saved;}}
          onStartDayClose={()=>{setClosingOpen(false);setClosingPreset(null);setDayCloseOpen(true);}}
        />
      )}
      {dayCloseOpen&&<TagesabschlussModal branch={branch} safeRefreshKey={safeRefreshKey} loadContext={()=>kassenabrechnungApi.dayCloseContext(branch)} finalizeDay={(payload)=>kassenabrechnungApi.finalizeDay(payload,branch)} onStartSafeCount={({forceNew})=>{setSafeCountMode({initialType:'closing',forceNewClosing:forceNew});setSafeCountOpen(true);}} onComplete={()=>setArchiveRefreshKey((current)=>current+1)} onClose={()=>setDayCloseOpen(false)}/>}
      {dayCloseV2Open&&<TagesabschlussV2Modal
        branch={branch}
        businessDate={selectedBusinessDate}
        context={{
          bankPayoutCents:282500,
          bankPayoutStatus:'provisional',
          looseChangeCents:1459,
          closingCount:5,
          latestSafeCount:{countedTotalCents:250081,countType:'handover',completedAt:new Date().toISOString()},
          safeStandardCents:250000,
          individualCashBanknotes:{5:11,10:26,20:28,50:30,100:1,200:0},
          eurocontrolSafeTargetCents:null,
          processStates:{},
        }}
        onStartProcess={(process)=>toast(`${process.title} wird als Nächstes gemeinsam aufgebaut.`,{icon:'🧩'})}
        onStartLegacy={()=>{setDayCloseV2Open(false);setDayCloseOpen(true);}}
        onClose={()=>setDayCloseV2Open(false)}
      />}
      {safeCountOpen && (
        <TresorzaehlungsModal
          branch={branch}
          initialType={safeCountMode.initialType}
          forceNewClosing={safeCountMode.forceNewClosing}
          onClose={() => {setSafeCountOpen(false);if(dayCloseOpen)setSafeRefreshKey((current)=>current+1);}}
          loadContext={(countType) => kassenabrechnungApi.safeContext(countType, branch)}
          verifyPin={(pin, options) => kasseneinzaehlungApi.verifyPin(pin, { ...options, branch })}
          onComplete={(payload) => kassenabrechnungApi.saveSafeCount(payload, branch)}
        />
      )}
      {receiptOpen&&<EinzahlungsbelegModal
        branch={branch}
        closings={receiptClosings}
        onClose={()=>setReceiptOpen(false)}
        onConfirm={async(payload)=>{
          const result=await kassenabrechnungApi.confirmDepositReceipt(payload,branch);
          await loadReceiptClosings();
          return result;
        }}
      />}
      {requiresBranchChoice && !branch && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="cash-branch-title">
          <div className="w-full max-w-2xl rounded-t-3xl bg-[#f7f4ef] p-5 text-[#1f1d1d] shadow-2xl sm:rounded-3xl sm:p-7">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#800000] text-white"><MapPin size={32} /></div>
            <h2 id="cash-branch-title" className="mt-4 text-center text-2xl font-black">Für welche Filiale arbeitest du gerade?</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-black/60">Dein Konto ist zentral auf „Alle“ gesetzt. Wähle für diesen Besuch eine echte Filiale. Die Auswahl gilt nur bis du das Modul verlässt.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {branches.map((item) => <button type="button" key={item.id || item.name} onClick={() => setBranch(item.name)} className="min-h-16 rounded-2xl border-2 border-[#800000]/15 bg-white px-5 text-lg font-black text-[#800000] shadow-sm hover:border-[#800000]">{item.name}</button>)}
            </div>
            {!branches.length && <p className="mt-5 text-center font-bold text-black/45">Aktive Filialen werden geladen …</p>}
            <button type="button" onClick={() => navigate('/start')} className="mt-6 min-h-12 w-full rounded-xl border px-5 font-bold">Abbrechen und zur Startseite</button>
          </div>
        </div>
      )}
    </main>
  );
}
