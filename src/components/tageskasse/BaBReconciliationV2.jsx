import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Scale } from 'lucide-react';
import { formatEuroFromCents } from '../../lib/kasseneinzaehlung.mjs';
import { parseMoneyToCents } from '../../lib/tagesabschlussV2.mjs';

export default function BaBReconciliationV2({ totalCents, onConfirm }) {
  const [differenceMode, setDifferenceMode] = useState(false);
  const [eurocontrolValue, setEurocontrolValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const confirmDifference = () => {
    const eurocontrolTotalCents = parseMoneyToCents(eurocontrolValue);
    if (!Number.isInteger(eurocontrolTotalCents)) return setError('Bitte den BaB-Wert aus EuroControl eingeben.');
    if (eurocontrolTotalCents === totalCents) return setError('Die Beträge stimmen überein. Bitte „Jo, passt!“ verwenden.');
    if (note.trim().length < 3) return setError('Bitte die Abweichung kurz beschreiben.');
    setError('');
    return onConfirm({ status:'difference', displayedTotalCents:totalCents, eurocontrolTotalCents, note:note.trim() });
  };

  return <div className="mx-auto max-w-2xl text-center">
    <Scale className="mx-auto text-[#800000]" size={58}/>
    <h3 className="mt-3 text-2xl font-black sm:text-3xl">BaB-Kontrollabgleich</h3>
    <p className="mt-2 text-black/60">Vergleiche die aufgelaufene Gesamtsumme mit dem Filialbericht in EuroControl.</p>
    <div className="mt-6 rounded-3xl bg-[#800000] p-6 text-white"><span className="text-xs font-black uppercase tracking-[.18em] text-white/65">Aufgelaufene Gesamtsumme BaB</span><strong className="mt-2 block text-4xl">{formatEuroFromCents(totalCents)}</strong></div>
    {!differenceMode&&<div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>onConfirm({status:'confirmed',displayedTotalCents:totalCents})} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-lg font-black text-white"><CheckCircle2/>Jo, passt!</button><button type="button" onClick={()=>setDifferenceMode(true)} className="flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-amber-500 bg-amber-50 px-5 font-black text-amber-950"><AlertTriangle/>Abweichung melden</button></div>}
    {differenceMode&&<div className="mt-6 rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 text-left text-amber-950">
      <label className="block text-sm font-black">BaB laut EuroControl<input autoFocus value={eurocontrolValue} onChange={(event)=>{setEurocontrolValue(event.target.value);setError('');}} inputMode="decimal" placeholder="0,00" className="mt-2 min-h-14 w-full rounded-xl border-2 border-amber-300 bg-white px-4 text-right text-xl font-black text-black outline-none focus:border-[#800000]"/></label>
      <label className="mt-4 block text-sm font-black">Kurze Bemerkung<textarea value={note} onChange={(event)=>{setNote(event.target.value);setError('');}} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border-2 border-amber-300 bg-white p-4 text-black outline-none focus:border-[#800000]"/></label>
      {Number.isInteger(parseMoneyToCents(eurocontrolValue))&&<div className="mt-4 rounded-xl bg-white p-4 font-bold">Differenz: {formatEuroFromCents(parseMoneyToCents(eurocontrolValue)-totalCents,{signed:true})}</div>}
      {error&&<div className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 p-3 font-bold text-red-800">{error}</div>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>{setDifferenceMode(false);setError('');}} className="min-h-12 rounded-xl border-2 border-amber-600 bg-white px-4 font-black">Zurück</button><button type="button" onClick={confirmDifference} className="min-h-12 rounded-xl bg-amber-700 px-4 font-black text-white">Abweichung speichern</button></div>
    </div>}
  </div>;
}
