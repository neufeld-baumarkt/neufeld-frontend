import { useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatEuroFromCents } from '../../lib/kasseneinzaehlung.mjs';

function Metric({ label, value, money = true }) {
  return <div className="rounded-2xl bg-white p-4"><span className="text-xs font-black uppercase text-black/45">{label}</span><strong className="mt-1 block text-xl sm:text-2xl">{money ? formatEuroFromCents(value) : value}</strong></div>;
}

export default function TagesabschlussV2Finalize({ reportData, calculation, safeCount, closingCount, demoMode = false, onFinalize, onBack }) {
  const [firstPin, setFirstPin] = useState('');
  const [secondPin, setSecondPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!/^\d{4}$/.test(firstPin) || !/^\d{4}$/.test(secondPin)) {
      setError('Bitte beide persönlichen PINs eingeben.');
      return;
    }
    if (firstPin === secondPin) {
      setError('Es müssen zwei unterschiedliche Personen bestätigen.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const completed = await onFinalize({ firstPin, secondPin });
      setResult(completed);
      setFirstPin('');
      setSecondPin('');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) return <div className="mx-auto max-w-3xl text-center">
    <CheckCircle2 className="mx-auto text-emerald-600" size={72}/>
    <h3 className="mt-4 text-3xl font-black">{demoMode ? 'Demo erfolgreich abgeschlossen' : 'Tagesabrechnung abgeschlossen'}</h3>
    <p className="mt-2 text-black/60">{demoMode ? 'Es wurden keine Daten gespeichert.' : 'Der Geschäftstag ist jetzt Read-only.'}</p>
    <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
      <Metric label="Auszahlung an Bank" value={calculation.bookingTotalCents}/>
      <Metric label="Tresor Schlussbestand" value={safeCount.countedTotalCents}/>
      <Metric label="Bestätigt von" value={result.approvals.map((person)=>person.name).join(' · ')} money={false}/>
      <Metric label="Status" value={demoMode ? 'Demo · nicht gespeichert' : 'Verbindlich · Read-only'} money={false}/>
    </div>
  </div>;

  return <div className="mx-auto max-w-4xl">
    <button type="button" onClick={onBack} className="mb-5 flex min-h-11 items-center gap-2 rounded-xl px-3 font-black text-black/60"><ArrowLeft size={19}/>Zur Übersicht</button>
    <div className="text-center"><ShieldCheck className="mx-auto text-[#800000]" size={58}/><h3 className="mt-3 text-2xl font-black sm:text-3xl">Tagesabrechnung abschließen</h3></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Metric label="Tagesumsatz" value={reportData.dailyRevenueCents}/>
      <Metric label="Kunden" value={reportData.customerCount} money={false}/>
      <Metric label="Durchschnittsbon" value={reportData.averageReceiptCents}/>
      <Metric label="Einzelabrechnungen" value={closingCount} money={false}/>
      <Metric label="Auszahlung an Bank" value={calculation.bookingTotalCents}/>
      <Metric label="Tresor Schlussbestand" value={safeCount.countedTotalCents}/>
      <Metric label="Tresordifferenz" value={safeCount.differenceCents}/>
    </div>
    <div className="mt-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-center font-bold text-amber-950">{demoMode ? 'Demo: Gebt zwei beliebige unterschiedliche vierstellige Zahlen ein. Sie werden nicht geprüft oder gespeichert.' : 'Mit euren PINs bestätigt ihr Tagesabrechnung, SafeBag und Tresorzählung.'}</div>
    {error&&<div className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 p-4 font-bold text-red-800">{error}</div>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-black">{demoMode ? 'Demo-Code 1' : 'PIN Mitarbeiter 1'}<input type="password" inputMode="numeric" maxLength="4" value={firstPin} onChange={(event)=>setFirstPin(event.target.value.replace(/\D/g,'').slice(0,4))} className="mt-2 min-h-14 w-full rounded-xl border-2 border-black/10 bg-white px-4 text-center text-2xl tracking-[.4em] outline-none focus:border-[#800000]"/></label>
      <label className="text-sm font-black">{demoMode ? 'Demo-Code 2' : 'PIN Mitarbeiter 2'}<input type="password" inputMode="numeric" maxLength="4" value={secondPin} onChange={(event)=>setSecondPin(event.target.value.replace(/\D/g,'').slice(0,4))} className="mt-2 min-h-14 w-full rounded-xl border-2 border-black/10 bg-white px-4 text-center text-2xl tracking-[.4em] outline-none focus:border-[#800000]"/></label>
    </div>
    <button type="button" disabled={busy} onClick={submit} className="mt-6 min-h-14 w-full rounded-xl bg-emerald-700 px-5 text-lg font-black text-white disabled:opacity-50">{busy ? 'Wird abgeschlossen …' : demoMode ? 'Demo abschließen' : 'Verbindlich abschließen'}</button>
  </div>;
}
