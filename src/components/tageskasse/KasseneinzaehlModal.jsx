import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Check,
  CircleAlert,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import {
  CASH_DENOMINATIONS,
  TARGET_CENTS,
  countCashCents,
  formatEuroFromCents,
  matchesImmediatePreviousClosing,
  nextDifferenceStep,
  openingDifferenceCents,
} from '../../lib/kasseneinzaehlung.mjs';

const EMPTY_COUNTS = Object.freeze({});

function PinStep({ title, description, pin, setPin, onSubmit, busy, hint }) {
  return <div className="mx-auto max-w-lg">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#800000] text-white"><LockKeyhole size={32}/></div>
    <h3 className="mt-5 text-center text-2xl font-black">{title}</h3>
    <p className="mt-2 text-center text-black/60">{description}</p>
    <form onSubmit={onSubmit} className="mt-6">
      <label className="block text-sm font-bold" htmlFor="cash-count-pin">Persönlicher Mitarbeiter-PIN</label>
      <input
        id="cash-count-pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={pin}
        onChange={(event)=>setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
        className="mt-2 min-h-14 w-full rounded-xl border-2 border-black/15 px-4 text-center text-3xl font-black tracking-[.45em] outline-none focus:border-[#800000] focus:ring-4 focus:ring-[#800000]/10"
        placeholder="••••"
        autoFocus
      />
      {hint&&<p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{hint}</p>}
      <button disabled={busy||pin.length!==4} className="mt-5 min-h-12 w-full rounded-xl bg-[#800000] px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
        {busy?'PIN wird geprüft …':'PIN bestätigen'}
      </button>
    </form>
  </div>;
}

function CashGrid({ counts, setCounts, countedCents, title, instruction }) {
  return <div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 className="text-2xl font-black">{title}</h3>
        <p className="mt-1 text-black/60">{instruction}</p>
      </div>
      <div className={`rounded-2xl px-5 py-3 text-right ${countedCents===TARGET_CENTS?'bg-emerald-100 text-emerald-800':'bg-[#f2ede7] text-[#800000]'}`}>
        <div className="text-xs font-black uppercase tracking-wider">Aktuell gezählt</div>
        <div className="text-3xl font-black">{formatEuroFromCents(countedCents)}</div>
        <div className="text-xs font-bold">Ziel: 250,00 €</div>
      </div>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {CASH_DENOMINATIONS.map((denomination)=><label key={denomination.cents} className="rounded-xl border bg-[#faf9f7] p-3 text-center">
        <span className="text-sm font-black">{denomination.label}</span>
        <input
          inputMode="numeric"
          min="0"
          type="number"
          value={counts[denomination.cents]??''}
          onChange={(event)=>setCounts((current)=>({ ...current, [denomination.cents]: event.target.value }))}
          className="mt-2 min-h-12 w-full rounded-lg border px-2 text-center text-lg font-bold outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/15"
        />
        <span className="mt-1 block text-xs text-black/45">= {formatEuroFromCents(denomination.cents*(Number(counts[denomination.cents])||0))}</span>
      </label>)}
    </div>
  </div>;
}

export default function KasseneinzaehlModal({ branch, onClose, verifyPin, previousClosingFor, onComplete }) {
  const [stage, setStage] = useState('pin');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [employee, setEmployee] = useState(null);
  const [drawerNumber, setDrawerNumber] = useState(null);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [attempts, setAttempts] = useState([]);
  const [counter, setCounter] = useState(null);
  const [previousClosing, setPreviousClosing] = useState(null);
  const [result, setResult] = useState(null);
  const countedCents = useMemo(()=>countCashCents(counts), [counts]);
  const differenceCents = openingDifferenceCents(countedCents);

  useEffect(()=>{
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return ()=>window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const authenticate = async (event, secondPerson = false) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const identified = await verifyPin(pin, { branch, excludeEmployeeId: secondPerson ? employee?.id : null });
      if (secondPerson) {
        setCounter(identified);
        setPin('');
        setCounts({});
        setStage('count');
      } else {
        setEmployee(identified);
        setPin('');
        setStage('drawer');
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const chooseDrawer = async (number) => {
    setDrawerNumber(number);
    setPreviousClosing(await previousClosingFor({ branch, drawerNumber: number }));
    setStage('count');
  };

  const currentAttempt = () => ({ counts: { ...counts }, countedCents, countedBy: counter||employee });

  const finish = async (openingCents, carryoverDecision = 'none') => {
    const completedAttempts = [...attempts, currentAttempt()];
    const firstDifference = openingDifferenceCents(completedAttempts[0].countedCents);
    const matchedBeforeNormalization = matchesImmediatePreviousClosing({
      branch, drawerNumber, openingDifference: firstDifference, previousClosing,
    });
    const effectiveCarryoverDecision = carryoverDecision === 'none' && matchedBeforeNormalization
      ? 'normalize-to-target'
      : carryoverDecision;
    setError('');
    setBusy(true);
    try {
      const saved = await onComplete({ drawerNumber, carryoverDecision: effectiveCarryoverDecision, attempts: completedAttempts });
      setResult({
        employee,
        counter,
        drawerNumber,
        openingCents,
        openingDifferenceCents: openingDifferenceCents(openingCents),
        carryoverDecision: effectiveCarryoverDecision,
        attempts: completedAttempts,
        saved,
      });
      setStage('complete');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const checkCount = () => {
    setError('');
    if (countedCents <= 0) return setError('Bitte zuerst die Stückelungen der Lade eintragen.');
    if (countedCents === TARGET_CENTS) return finish(countedCents);

    if (attempts.length === 0 && matchesImmediatePreviousClosing({
      branch, drawerNumber, openingDifference: differenceCents, previousClosing,
    })) {
      setStage('match');
      return;
    }

    const updated = [...attempts, currentAttempt()];
    setAttempts(updated);
    const next = nextDifferenceStep(updated.length-1);
    if (next === 'same-person-recount') {
      setCounts({});
      setStage('count');
      return;
    }
    if (next === 'recommend-other-person') {
      setStage('second-person-choice');
      return;
    }
    setStage('adjust');
  };

  const startAnotherCount = () => {
    setCounts({});
    setStage('count');
  };

  const progress = ['pin','drawer','count','match','second-person-choice','second-pin','adjust','complete'];
  const progressIndex = Math.max(0, progress.indexOf(stage));

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="cash-count-title">
    <div className="flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-[#f7f4ef] text-[#242121] shadow-2xl sm:max-h-[94dvh] sm:rounded-3xl">
      <header className="flex items-center justify-between gap-3 bg-[#800000] px-4 py-4 text-white sm:px-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.2em] text-white/65">Tageskassenabrechnung</div>
          <h2 id="cash-count-title" className="text-xl font-black sm:text-2xl">Kasse einzählen</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Modal schließen" className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X/></button>
      </header>
      <div className="h-1 bg-black/10"><div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, ((progressIndex+1)/progress.length)*100)}%` }}/></div>

      <div className="overflow-y-auto p-4 sm:p-7">
        <div className="mb-5 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Filiale: {branch||'nicht zugeordnet'}</span>
          {employee&&<span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Mitarbeiter: {employee.name}</span>}
          {drawerNumber&&<span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Lade {drawerNumber}</span>}
        </div>
        {error&&<div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-800"><CircleAlert className="mt-0.5 shrink-0" size={20}/>{error}</div>}

        {stage==='pin'&&<PinStep title="Wer beginnt diese Kassenschicht?" description="Mit deinem persönlichen PIN beginnt die Einzählung und wird dir eindeutig zugeordnet." pin={pin} setPin={setPin} onSubmit={authenticate} busy={busy}/>}

        {stage==='drawer'&&<div>
          <div className="text-center"><Banknote className="mx-auto text-[#800000]" size={48}/><h3 className="mt-3 text-2xl font-black">Welche Lade zählst du ein?</h3><p className="mt-2 text-black/60">Die Zuordnung bleibt für die gesamte Kassenschicht bestehen.</p></div>
          <div className="mx-auto mt-7 grid max-w-xl grid-cols-2 gap-4">{[1,2].map((number)=><button key={number} onClick={()=>chooseDrawer(number)} className="aspect-square rounded-full border-4 border-[#800000]/20 bg-white text-2xl font-black text-[#800000] shadow-lg transition hover:-translate-y-1 hover:border-[#800000] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#800000]/20">Lade<br/><span className="text-6xl">{number}</span></button>)}</div>
        </div>}

        {stage==='count'&&<CashGrid counts={counts} setCounts={setCounts} countedCents={countedCents} title={attempts.length===0?'Lade vollständig zählen':counter?`${counter.name} zählt jetzt nach`:'Bitte vollständig nachzählen'} instruction={attempts.length===0?'Trage nur die Anzahl jeder Münze und jedes Scheins ein. Die App rechnet automatisch.':'Beginne die Zählung erneut bei null. Die vorherige Zählung bleibt im Protokoll erhalten.'}/>}

        {stage==='match'&&<div className="mx-auto max-w-2xl text-center">
          <ShieldCheck className="mx-auto text-emerald-700" size={56}/>
          <h3 className="mt-4 text-2xl font-black">Passende Vorgängerdifferenz gefunden</h3>
          <p className="mt-3 text-black/65">Deine Anfangsabweichung von <strong>{formatEuroFromCents(differenceCents,{signed:true})}</strong> passt exakt zur letzten Abrechnung von Lade {drawerNumber} ({formatEuroFromCents(previousClosing.differenceCents,{signed:true})}).</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button disabled={busy} onClick={()=>finish(countedCents,'keep-in-drawer')} className="min-h-28 rounded-2xl bg-emerald-700 p-4 text-left font-black text-white disabled:opacity-50"><Check className="mb-2"/>{busy?'Einzählung wird gespeichert …':'Differenz in der Lade belassen'}<span className="mt-1 block text-sm font-normal text-white/75">Startbestand wird {formatEuroFromCents(countedCents)} und gleicht später die Filialdifferenz aus.</span></button>
            <button disabled={busy} onClick={()=>{setAttempts(current=>[...current,currentAttempt()]);setStage('adjust');}} className="min-h-28 rounded-2xl border-2 border-[#800000] bg-white p-4 text-left font-black text-[#800000] disabled:opacity-50"><RotateCcw className="mb-2"/>Auf 250,00 € ausgleichen<span className="mt-1 block text-sm font-normal text-black/55">Auffüllen beziehungsweise abschöpfen und anschließend kontrollieren.</span></button>
          </div>
        </div>}

        {stage==='second-person-choice'&&<div className="mx-auto max-w-2xl text-center">
          <UsersRound className="mx-auto text-amber-700" size={56}/><h3 className="mt-4 text-2xl font-black">Bitte nach Möglichkeit eine zweite Person zählen lassen</h3><p className="mt-3 text-black/65">Auch die Korrekturzählung weicht ab. Eine andere Person senkt jetzt das Risiko eines wiederholten Zählfehlers.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={()=>{setPin('');setStage('second-pin');}} className="min-h-24 rounded-2xl bg-[#800000] p-4 font-black text-white"><UsersRound className="mx-auto mb-2"/>Zweite Person übernimmt</button><button onClick={startAnotherCount} className="min-h-24 rounded-2xl border-2 border-black/15 bg-white p-4 font-black"><UserRound className="mx-auto mb-2"/>Ich zähle selbst erneut</button></div>
        </div>}

        {stage==='second-pin'&&<PinStep title="Zweite Person bestätigen" description="Die nachzählende Person bestätigt sich mit ihrem eigenen PIN." pin={pin} setPin={setPin} onSubmit={(event)=>authenticate(event,true)} busy={busy}/>}

        {stage==='adjust'&&<div className="mx-auto max-w-2xl text-center">
          <RotateCcw className="mx-auto text-[#800000]" size={56}/><h3 className="mt-4 text-2xl font-black">Lade auf 250,00 € ausgleichen</h3><p className="mt-3 text-black/65">{differenceCents>0?`Bitte ${formatEuroFromCents(differenceCents)} abschöpfen.`:`Bitte ${formatEuroFromCents(Math.abs(differenceCents))} auffüllen.`} Danach muss eine abschließende Kontrollzählung exakt 250,00 € ergeben.</p>
          <button onClick={startAnotherCount} className="mt-6 min-h-12 rounded-xl bg-[#800000] px-6 font-black text-white">Ausgleich durchgeführt – Kontrollzählung starten</button>
        </div>}

        {stage==='complete'&&<div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white"><Check size={46}/></div>
          <h3 className="mt-5 text-3xl font-black">Kasse ist eingezählt</h3><p className="mt-2 text-black/60">Die Kassenschicht von {result.employee.name} mit Lade {result.drawerNumber} kann beginnen.</p>
          <div className="mt-6 grid gap-3 rounded-2xl bg-white p-5 text-left shadow-sm sm:grid-cols-2"><div><span className="text-xs font-bold uppercase text-black/45">Verbindlicher Anfangsbestand</span><strong className="mt-1 block text-2xl">{formatEuroFromCents(result.openingCents)}</strong></div><div><span className="text-xs font-bold uppercase text-black/45">Status</span><strong className="mt-1 block text-lg text-emerald-700">{result.carryoverDecision==='keep-in-drawer'?'Vorgängerdifferenz übernommen':'Ordnungsgemäß eingezählt'}</strong></div></div>
          <button onClick={onClose} className="mt-6 min-h-12 rounded-xl bg-emerald-700 px-7 font-black text-white">Fertig</button>
        </div>}
      </div>

      {stage==='count'&&<footer className="flex flex-col-reverse gap-3 border-t bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><button type="button" disabled={busy} onClick={()=>setStage(drawerNumber?'drawer':'pin')} className="min-h-12 rounded-xl border px-5 font-bold disabled:opacity-50"><ArrowLeft className="mr-2 inline" size={18}/>Zurück</button><button type="button" disabled={busy} onClick={checkCount} className="min-h-12 rounded-xl bg-[#800000] px-6 font-black text-white disabled:opacity-50">{busy?'Einzählung wird gespeichert …':'Zählung prüfen'}</button></footer>}
    </div>
  </div>;
}
