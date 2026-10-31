import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Landmark,
  LockKeyhole,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { formatEuroFromCents } from '../../lib/kasseneinzaehlung.mjs';
import { buildDayCloseV2ViewModel, calculateBankBooking, mapDayCloseContextToV2, parseMoneyToCents, validateDailyReport } from '../../lib/tagesabschlussV2.mjs';
import BarAnBankV2Process from './BarAnBankV2Process';
import TagesabschlussV2Finalize from './TagesabschlussV2Finalize';
import TresorabschlussV2Process from './TresorabschlussV2Process';

const dateTime = (value) => value
  ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Noch nicht gezählt';

const typeLabel = (value) => ({ morning: 'Morgenzählung', handover: 'Schichtübergabe', closing: 'Abendzählung' }[value] || 'Tresorzählung');

const groupIcons = {
  Vorbereitung: Banknote,
  'Am PC': Monitor,
  'Am Tresor': Landmark,
  Abschluss: ShieldCheck,
};

function MoneyValue({ cents, empty = 'Noch nicht erfasst' }) {
  return <strong className="mt-1 block text-2xl sm:text-3xl">{Number.isInteger(cents) ? formatEuroFromCents(cents) : empty}</strong>;
}

function SummaryCard({ label, children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-black/10 bg-white',
    amber: 'border-amber-300 bg-amber-50 text-amber-950',
    green: 'border-emerald-300 bg-emerald-50 text-emerald-950',
  };
  return <div className={`rounded-2xl border-2 p-4 ${tones[tone]}`}>
    <span className="text-xs font-black uppercase tracking-wide opacity-50">{label}</span>
    {children}
  </div>;
}

const emptyReport = { dailyRevenue: '', customerCount: '', averageReceipt: '', eurocontrolBank: '' };

function Field({ label, name, value, error, onChange, integer = false }) {
  return <label className="block text-sm font-black">{label}
    <input name={name} value={value} onChange={onChange} inputMode={integer ? 'numeric' : 'decimal'} autoComplete="off" className={`mt-2 min-h-14 w-full rounded-xl border-2 bg-white px-4 text-xl font-black outline-none focus:border-[#800000] ${error ? 'border-red-500' : 'border-black/10'}`} />
    {error&&<span className="mt-1 block text-sm font-bold text-red-700">{error}</span>}
  </label>;
}

function ProcessCard({ process, onStart, infoOpen, onToggleInfo }) {
  const Icon = groupIcons[process.group] || Check;
  const completed = process.status === 'completed';
  const inProgress = process.status === 'in_progress';
  const locked = process.status === 'locked';
  const action = completed ? 'Ansehen' : inProgress ? 'Fortsetzen' : locked ? 'Noch nicht möglich' : 'Starten';
  return <div className={`rounded-2xl border-2 p-3 ${completed ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : inProgress ? 'border-amber-300 bg-amber-50 text-amber-950' : locked ? 'border-black/10 bg-black/[.035] text-black/45' : 'border-black/10 bg-white'}`}>
    <div className="flex items-start gap-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${completed ? 'bg-emerald-600 text-white' : inProgress ? 'bg-amber-400 text-amber-950' : locked ? 'bg-black/10' : 'bg-[#800000] text-white'}`}>
        {completed ? <CheckCircle2 size={23}/> : locked ? <LockKeyhole size={22}/> : <Icon size={22}/>} 
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div><span className="text-xs font-black uppercase tracking-wide opacity-50">{process.group}</span><h4 className="font-black sm:text-lg">{process.title}</h4></div>
          <button type="button" onClick={onToggleInfo} className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-black/5" aria-label={`Information zu ${process.title}`} aria-expanded={infoOpen}><CircleHelp size={21}/></button>
        </div>
        {infoOpen&&<div className="mt-2 rounded-xl bg-black/[.055] p-3 text-sm font-bold">{process.description}</div>}
        {completed&&process.completedAt&&<div className="mt-2 text-sm opacity-65">Erledigt {dateTime(process.completedAt)}{process.completedBy ? ` · ${process.completedBy}` : ''}</div>}
        {locked&&<div className="mt-2 text-sm font-bold">Vorherige Pflichtschritte fehlen noch.</div>}
      </div>
    </div>
    <button type="button" disabled={locked} onClick={()=>onStart?.(process)} className={`mt-3 min-h-11 w-full rounded-xl px-4 font-black sm:ml-14 sm:w-auto ${completed ? 'border-2 border-emerald-700 bg-white text-emerald-800' : inProgress ? 'bg-amber-400 text-amber-950' : 'bg-[#800000] text-white'} disabled:bg-black/10 disabled:text-black/35`}>{action}</button>
  </div>;
}

export default function TagesabschlussV2Modal({ branch, businessDate, context: initialContext, loadContext, verifyPin, saveDailyMetrics, saveSafeCount, finalizeDay, onComplete, onStartProcess, onStartLegacy, onClose }) {
  const [openInfo, setOpenInfo] = useState('');
  const [stage, setStage] = useState(loadContext ? 'loading' : 'report');
  const [dayCloseContext, setDayCloseContext] = useState(null);
  const [contextError, setContextError] = useState('');
  const [report, setReport] = useState(emptyReport);
  const [reportData, setReportData] = useState(null);
  const [errors, setErrors] = useState({});
  const [canOpenDepositSafe, setCanOpenDepositSafe] = useState(null);
  const [activeProcess, setActiveProcess] = useState('');
  const [manualBanknoteCounts, setManualBanknoteCounts] = useState({});
  const [localProcessStates, setLocalProcessStates] = useState({});
  const [safeTargetInput, setSafeTargetInput] = useState('');
  const [safeTargetCents, setSafeTargetCents] = useState(null);
  const [safeTargetError, setSafeTargetError] = useState('');
  const [finalSafeCount, setFinalSafeCount] = useState(null);
  const [persistedFinalSafeCount, setPersistedFinalSafeCount] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const context = useMemo(() => dayCloseContext ? mapDayCloseContextToV2(dayCloseContext) : (initialContext || {}), [dayCloseContext, initialContext]);
  useEffect(() => {
    if (!loadContext) return;
    let active = true;
    setContextError('');
    loadContext().then((loaded) => {
      if (!active) return;
      if (loaded?.activeOpenings?.length) throw new Error('Es sind noch aktive Kassenschichten vorhanden.');
      if (!loaded?.closings?.length) throw new Error('Es wurde noch keine Kasse abgerechnet.');
      setDayCloseContext(loaded);
      if (loaded.finalSafeCount) {
        setFinalSafeCount(loaded.finalSafeCount);
        setPersistedFinalSafeCount(loaded.finalSafeCount);
      }
      if (loaded.dailyMetrics) {
        setReportData(loaded.dailyMetrics);
        setStage('safe-access');
      } else setStage('report');
    }).catch((failure) => {
      if (!active) return;
      setContextError(failure.message);
      setStage('load-error');
    });
    return () => { active = false; };
  }, [loadContext]);
  const banknoteCounts = canOpenDepositSafe === false ? (context.individualCashBanknotes || {}) : manualBanknoteCounts;
  const bankCalculation = useMemo(() => calculateBankBooking({
    banknoteCounts,
    eurocontrolBankCents: reportData?.eurocontrolBankCents,
    looseChangeCents: context.looseChangeCents,
    latestSafeCountCents: context.latestSafeCount?.countedTotalCents,
    safeStandardCents: context.safeStandardCents,
  }), [banknoteCounts, context.latestSafeCount?.countedTotalCents, context.looseChangeCents, context.safeStandardCents, reportData?.eurocontrolBankCents]);
  const bookingCompleted = localProcessStates['bank-booking']?.status === 'completed';
  const enrichedContext = useMemo(() => ({
    ...context,
    bankPayoutCents: bookingCompleted ? bankCalculation.bookingTotalCents : (reportData?.eurocontrolBankCents ?? context.bankPayoutCents),
    bankPayoutStatus: bookingCompleted ? 'final' : 'provisional',
    eurocontrolSafeTargetCents: safeTargetCents,
    latestSafeCount: finalSafeCount || context.latestSafeCount,
    processStates: {
      ...context.processStates,
      ...localProcessStates,
      ...(reportData ? { 'daily-report': { status: 'completed' } } : {}),
      ...(canOpenDepositSafe === false ? {
        'bank-preparation': {
          status: 'completed',
          description: 'Die App stellt die Stückelung automatisch aus den Einzelkassen bereit.',
        },
      } : {}),
    },
  }), [bankCalculation.bookingTotalCents, bookingCompleted, canOpenDepositSafe, context, finalSafeCount, localProcessStates, reportData, safeTargetCents]);
  const model = useMemo(() => buildDayCloseV2ViewModel(enrichedContext), [enrichedContext]);
  const openProcesses = model.processes.filter((process) => process.status !== 'completed');
  const completedProcesses = model.processes.filter((process) => process.status === 'completed');
  const recommendedProcess = openProcesses.find((process) => process.status === 'in_progress')
    || openProcesses.find((process) => process.status === 'open');
  const safe = model.summary.latestSafeCount;
  const bankFinal = model.summary.bankPayoutStatus === 'final';

  const updateReport = (event) => setReport((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submitReport = async (event) => {
    event.preventDefault();
    const result = validateDailyReport(report);
    setErrors(result.errors);
    if (!result.valid) return;
    try {
      if (!saveDailyMetrics) throw new Error('Das Speichern der Tageswerte ist nicht verbunden.');
      await saveDailyMetrics(result.data);
      setReportData(result.data);
    } catch (failure) {
      setErrors({ form: failure.message });
      return;
    }
    setSafeTargetInput('');
    setSafeTargetCents(null);
    setSafeTargetError('');
    setFinalSafeCount(null);
    setPersistedFinalSafeCount(null);
    setLocalProcessStates((current) => {
      const { 'bank-booking': _booking, 'safe-movement': _movement, 'final-safe-count': _count, ...rest } = current;
      return rest;
    });
    setStage('safe-access');
  };

  const chooseSafeAccess = (value) => {
    setCanOpenDepositSafe(value);
    setSafeTargetInput('');
    setSafeTargetCents(null);
    setSafeTargetError('');
    setFinalSafeCount(null);
    setPersistedFinalSafeCount(null);
    setLocalProcessStates((current) => {
      const { 'bank-preparation': _preparation, 'bank-booking': _booking, 'safe-movement': _movement, 'final-safe-count': _count, ...rest } = current;
      return rest;
    });
    setStage('dashboard');
  };

  const startProcess = (process) => {
    if (['bank-preparation', 'bank-booking', 'safe-movement', 'final-safe-count', 'finalize'].includes(process.id)) {
      setActiveProcess(process.id);
      setStage('process');
      return;
    }
    onStartProcess?.(process);
  };

  const updateBanknoteCount = (denomination, value) => {
    const digits = String(value).replace(/\D/g, '');
    setManualBanknoteCounts((current) => ({ ...current, [denomination]: digits ? Number(digits) : 0 }));
  };

  const finishPreparation = () => {
    if (canOpenDepositSafe) setLocalProcessStates((current) => {
      const { 'bank-booking': _booking, ...rest } = current;
      return { ...rest, 'bank-preparation': { status: 'completed' } };
    });
    setStage('dashboard');
    setActiveProcess('');
  };

  const finishBooking = () => {
    const parsed = parseMoneyToCents(safeTargetInput);
    if (!Number.isInteger(parsed)) {
      setSafeTargetError('Bitte Tresor-SOLL eingeben.');
      return;
    }
    if (parsed !== bankCalculation.expectedSafeAfterSkimCents) {
      setSafeTargetError(`Bitte prüfen: Die App erwartet ${formatEuroFromCents(bankCalculation.expectedSafeAfterSkimCents)}.`);
      return;
    }
    setSafeTargetError('');
    setSafeTargetCents(parsed);
    setLocalProcessStates((current) => {
      const { 'safe-movement': _movement, 'final-safe-count': _count, ...rest } = current;
      return { ...rest, 'bank-booking': { status: 'completed', completedAt: new Date().toISOString() } };
    });
    setStage('dashboard');
    setActiveProcess('');
  };

  const finishMovement = () => {
    setLocalProcessStates((current) => {
      const { 'final-safe-count': _count, ...rest } = current;
      return { ...rest, 'safe-movement': { status: 'completed', completedAt: new Date().toISOString() } };
    });
    setStage('dashboard');
    setActiveProcess('');
  };

  const finishSafeCount = (result) => {
    const completedAt = new Date().toISOString();
    setFinalSafeCount({ ...result, completedAt, countType: 'closing' });
    setLocalProcessStates((current) => ({ ...current, 'final-safe-count': { status: 'completed', completedAt } }));
    setStage('dashboard');
    setActiveProcess('');
  };

  const finalizeV2 = async ({ firstPin, secondPin }) => {
    if (!verifyPin || !saveSafeCount || !finalizeDay || !dayCloseContext) {
      throw new Error('Der verbindliche Abschluss ist in dieser Vorschau nicht verbunden.');
    }
    const first = await verifyPin(firstPin);
    const second = await verifyPin(secondPin, { excludeEmployeeId: first.id });
    let savedSafeCount = persistedFinalSafeCount;
    if (!savedSafeCount) {
      savedSafeCount = await saveSafeCount({
        countType: 'closing',
        mode: 'full_count',
        repeatClosingConfirmed: Boolean(dayCloseContext.finalSafeCount),
        looseMoneyCents: finalSafeCount.looseMoneyCents,
        coinRollCounts: finalSafeCount.rollCounts,
        banknoteCounts: finalSafeCount.noteCounts,
        eurocontrolTotalCents: safeTargetCents,
        counterProofToken: first.proofToken,
        recorderProofToken: second.proofToken,
      });
      setPersistedFinalSafeCount(savedSafeCount);
    }
    const report = await finalizeDay({
      safeCountId: savedSafeCount.id,
      eurocontrolCashTotalCents: reportData.eurocontrolBankCents,
      looseChangePayoutConfirmed: true,
      additionalSafeSkimConfirmed: true,
      bankPayoutConfirmed: true,
      safeBagConfirmed: true,
      workflowVersion: 'v2',
      dailyMetrics: {
        dailyRevenueCents: reportData.dailyRevenueCents,
        customerCount: reportData.customerCount,
        averageReceiptCents: reportData.averageReceiptCents,
      },
      approvalProofTokens: [first.proofToken, second.proofToken],
    });
    const approvals = [{ id: first.id, name: first.name }, { id: second.id, name: second.name }];
    setLocalProcessStates((current) => ({ ...current, finalize: { status: 'completed', completedAt: new Date().toISOString() } }));
    onComplete?.(report);
    return { report, approvals };
  };

  return <div className="fixed inset-0 z-[115] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="day-close-v2-title">
    <section className="flex max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-[#f7f4ef] text-black shadow-2xl sm:max-h-[94dvh] sm:rounded-3xl">
      <header className="flex items-center justify-between bg-[#800000] px-5 py-4 text-white">
        <div><div className="text-xs font-bold uppercase tracking-[.2em] text-white/65">Tageskassenabrechnung · DEV</div><h2 id="day-close-v2-title" className="text-2xl font-black">Tagesabrechnung</h2></div>
        <button type="button" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="Schließen"><X/></button>
      </header>

      <div className="overflow-y-auto p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white px-3 py-1.5">Filiale: {branch}</span><span className="rounded-full bg-white px-3 py-1.5">Geschäftstag: {businessDate}</span></div>

        {stage==='loading'&&<div className="py-16 text-center"><RefreshCw className="mx-auto animate-spin text-[#800000]" size={52}/><p className="mt-4 font-bold">Geschäftstag wird geladen …</p></div>}
        {stage==='load-error'&&<div className="mx-auto max-w-2xl rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-center font-bold text-red-800">{contextError}</div>}

        {stage==='report'&&<form onSubmit={submitReport} className="mx-auto max-w-3xl">
          <div className="text-center"><Monitor className="mx-auto text-[#800000]" size={48}/><h3 className="mt-3 text-2xl font-black sm:text-3xl">Tageswerte erfassen</h3><p className="mt-2 text-black/60">Öffne den Filialbericht in EuroControl.</p></div>
          <div className="mt-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950">
            <strong className="block text-lg">In die Signal-Gruppe senden:</strong>
            <span className="mt-1 block">{branch} · Tagesumsatz · Kundenanzahl · Durchschnittsbon</span>
          </div>
          {errors.form&&<div className="mt-5 rounded-xl border-2 border-red-300 bg-red-50 p-4 font-bold text-red-800">{errors.form}</div>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Tagesumsatz" name="dailyRevenue" value={report.dailyRevenue} error={errors.dailyRevenue} onChange={updateReport}/>
            <Field label="Kundenanzahl" name="customerCount" value={report.customerCount} error={errors.customerCount} onChange={updateReport} integer/>
            <Field label="Durchschnittsbon" name="averageReceipt" value={report.averageReceipt} error={errors.averageReceipt} onChange={updateReport}/>
            <Field label="Bar an Bank laut Filialbericht" name="eurocontrolBank" value={report.eurocontrolBank} error={errors.eurocontrolBank} onChange={updateReport}/>
          </div>
          <button type="submit" className="mt-6 min-h-14 w-full rounded-xl bg-[#800000] px-5 text-lg font-black text-white">Werte speichern</button>
        </form>}

        {stage==='safe-access'&&<div className="mx-auto max-w-3xl text-center">
          <Landmark className="mx-auto text-[#800000]" size={54}/><h3 className="mt-3 text-2xl font-black sm:text-3xl">Könnt ihr den Einwurftresor öffnen?</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={()=>chooseSafeAccess(true)} className="min-h-36 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-5 text-left text-emerald-950"><strong className="text-2xl">Ja</strong><span className="mt-2 block">Das Geld wird physisch gezählt.</span></button>
            <button type="button" onClick={()=>chooseSafeAccess(false)} className="min-h-36 rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 text-left text-amber-950"><strong className="text-2xl">Nein</strong><span className="mt-2 block">Die App stellt die Stückelung aus den Kassen bereit.</span></button>
          </div>
          <button type="button" onClick={()=>setStage('report')} className="mt-5 min-h-11 rounded-xl px-5 font-bold text-black/60">← Tageswerte ändern</button>
        </div>}

        {stage==='process'&&(activeProcess==='bank-preparation'||activeProcess==='bank-booking')&&<BarAnBankV2Process
          mode={activeProcess}
          canOpenDepositSafe={canOpenDepositSafe}
          counts={banknoteCounts}
          calculation={bankCalculation}
          safeTargetValue={safeTargetInput}
          safeTargetError={safeTargetError}
          onSafeTargetChange={(event)=>{setSafeTargetInput(event.target.value);setSafeTargetError('');}}
          onCountsChange={updateBanknoteCount}
          onSavePreparation={finishPreparation}
          onConfirmBooking={finishBooking}
          onBack={()=>{setStage('dashboard');setActiveProcess('');}}
        />}

        {stage==='process'&&(activeProcess==='safe-movement'||activeProcess==='final-safe-count')&&<TresorabschlussV2Process
          mode={activeProcess}
          transferCents={bankCalculation.safeTransferCents}
          safeTargetCents={safeTargetCents}
          fixedDrawerCents={context.fixedDrawerCents ?? 50000}
          littleBerthaCents={context.littleBerthaCents ?? 100000}
          onConfirmMovement={finishMovement}
          onSaveCount={finishSafeCount}
          onBack={()=>{setStage('dashboard');setActiveProcess('');}}
        />}

        {stage==='process'&&activeProcess==='finalize'&&<TagesabschlussV2Finalize
          reportData={reportData}
          calculation={bankCalculation}
          safeCount={finalSafeCount}
          closingCount={context.closingCount}
          onFinalize={finalizeV2}
          onBack={()=>{setStage('dashboard');setActiveProcess('');}}
        />}

        {stage==='dashboard'&&<>
        <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4 ${canOpenDepositSafe ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>
          <div className="flex items-center gap-3"><Users/><div><strong className="block">Einwurftresor: {canOpenDepositSafe ? 'kann geöffnet werden' : 'kann nicht geöffnet werden'}</strong><span className="text-sm">{canOpenDepositSafe ? 'Spätere Stückelung durch physische Zählung.' : 'Spätere Stückelung aus den Einzelkassen.'}</span></div></div>
          <button type="button" onClick={()=>setStage('safe-access')} className="min-h-11 rounded-xl border-2 border-current px-4 font-black">Ändern</button>
        </div>

        <div className="sticky top-0 z-10 rounded-2xl border-2 border-black/10 bg-[#f7f4ef]/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-xs font-black uppercase text-black/45">Fortschritt</span><strong className="ml-2">{model.progress.completed} von {model.progress.required} erledigt · {model.progress.percent} %</strong></div><button type="button" onClick={()=>setSummaryOpen((current)=>!current)} aria-expanded={summaryOpen} className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-black/10 bg-white px-4 font-black">Tagesübersicht <ChevronDown className={`transition ${summaryOpen?'rotate-180':''}`} size={18}/></button></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-label="Fortschritt der Tagesabrechnung" aria-valuenow={model.progress.percent} aria-valuemin="0" aria-valuemax="100"><div className="h-full bg-emerald-600" style={{width:`${model.progress.percent}%`}}/></div>
        </div>

        {summaryOpen&&<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Gesamt Bar an Bank" tone={bankFinal ? 'green' : 'amber'}><MoneyValue cents={model.summary.bankPayoutCents}/><span className="mt-1 block text-sm font-bold opacity-60">{bankFinal ? 'Verbindlich' : 'Vorläufig'}</span></SummaryCard>
          <SummaryCard label="Entnommenes Kleingeld"><MoneyValue cents={model.summary.looseChangeCents}/><span className="mt-1 block text-sm opacity-55">Aus {model.summary.closingCount} Kassen</span></SummaryCard>
          <SummaryCard label="Tresor IST"><MoneyValue cents={safe?.countedTotalCents} empty="Noch nicht gezählt"/><span className="mt-1 block text-sm opacity-55">{safe ? `${typeLabel(safe.countType)} · ${dateTime(safe.completedAt)}` : 'Keine Zählung vorhanden'}</span></SummaryCard>
          <SummaryCard label="Tresor SOLL"><MoneyValue cents={model.summary.eurocontrolSafeTargetCents}/><span className="mt-1 block text-sm opacity-55">{Number.isInteger(model.summary.eurocontrolSafeTargetCents) ? 'Aus EuroControl' : 'Noch nicht übertragen'}</span></SummaryCard>
        </div>
        }

        <div className="mt-6">
          {recommendedProcess&&<section><div className="mb-3 flex items-center gap-2"><Clock3 size={18} className="text-[#800000]"/><h3 className="text-lg font-black">Als Nächstes sinnvoll</h3></div><ProcessCard process={recommendedProcess} onStart={startProcess} infoOpen={openInfo===recommendedProcess.id} onToggleInfo={()=>setOpenInfo((current)=>current===recommendedProcess.id?'':recommendedProcess.id)}/></section>}
          {openProcesses.filter((process)=>process.id!==recommendedProcess?.id).length>0&&<section className="mt-6"><h3 className="mb-3 text-sm font-black uppercase tracking-wide text-black/45">Weitere offene Schritte</h3><div className="grid gap-3 md:grid-cols-2">{openProcesses.filter((process)=>process.id!==recommendedProcess?.id).map((process)=><ProcessCard key={process.id} process={process} onStart={startProcess} infoOpen={openInfo===process.id} onToggleInfo={()=>setOpenInfo((current)=>current===process.id?'':process.id)}/>)}</div></section>}
          {completedProcesses.length>0&&<section className="mt-6"><button type="button" onClick={()=>setCompletedOpen((current)=>!current)} className="flex min-h-11 w-full items-center justify-between rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 font-black text-emerald-900"><span>Erledigt · {completedProcesses.length}</span><ChevronDown className={`transition ${completedOpen?'rotate-180':''}`} size={18}/></button>{completedOpen&&<div className="mt-3 grid gap-3 md:grid-cols-2">{completedProcesses.map((process)=><ProcessCard key={process.id} process={process} onStart={startProcess} infoOpen={openInfo===process.id} onToggleInfo={()=>setOpenInfo((current)=>current===process.id?'':process.id)}/>)}</div>}</section>}
        </div>

        <div className="mt-8 border-t border-black/10 pt-5 text-center"><button type="button" onClick={onStartLegacy} className="min-h-11 rounded-xl border-2 border-black/15 bg-white px-5 font-bold text-black/65">Bisherigen Tagesabschluss starten</button><p className="mt-2 text-xs text-black/40">DEV-Rückfallebene · der bisherige Ablauf bleibt unverändert</p></div>
        </>}
      </div>
    </section>
  </div>;
}

