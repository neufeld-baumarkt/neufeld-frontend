import { ArrowLeft, Banknote, CheckCircle2 } from 'lucide-react';
import { formatEuroFromCents } from '../../lib/kasseneinzaehlung.mjs';
import { BANKNOTE_DENOMINATIONS, sumBanknoteCounts } from '../../lib/tagesabschlussV2.mjs';

function DenominationTable({ counts, editable = false, onChange }) {
  return <div className="overflow-hidden rounded-2xl border-2 border-black/10 bg-white">
    {BANKNOTE_DENOMINATIONS.map((denomination)=><div key={denomination} className="grid grid-cols-[1fr_100px_1fr] items-center gap-3 border-b border-black/10 px-4 py-3 last:border-b-0">
      <strong>{denomination} €</strong>
      {editable
        ? <input aria-label={`${denomination} Euro Anzahl`} inputMode="numeric" value={counts[denomination] || ''} onChange={(event)=>onChange(denomination,event.target.value)} className="min-h-12 rounded-xl border-2 border-black/10 px-3 text-center text-lg font-black outline-none focus:border-[#800000]"/>
        : <strong className="rounded-lg bg-black/5 px-3 py-2 text-center">{counts[denomination] || 0}</strong>}
      <strong className="text-right text-[#800000]">{formatEuroFromCents((counts[denomination] || 0) * denomination * 100)}</strong>
    </div>)}
  </div>;
}

export default function BarAnBankV2Process({ mode, canOpenDepositSafe, counts, calculation, onCountsChange, onSavePreparation, onConfirmBooking, onBack }) {
  const preparation = mode === 'bank-preparation';
  const editable = preparation && canOpenDepositSafe;
  const shownCounts = preparation ? counts : calculation.finalCounts;
  const totalCents = preparation ? sumBanknoteCounts(counts) : calculation.finalDenominationTotalCents;

  return <div className="mx-auto max-w-3xl">
    <button type="button" onClick={onBack} className="mb-5 flex min-h-11 items-center gap-2 rounded-xl px-3 font-black text-black/60"><ArrowLeft size={19}/>Zur Übersicht</button>
    <div className="text-center"><Banknote className="mx-auto text-[#800000]" size={52}/><h3 className="mt-3 text-2xl font-black sm:text-3xl">{preparation ? 'Bar an Bank vorbereiten' : 'Bar an Bank buchen'}</h3>
      <p className="mt-2 text-black/60">{preparation ? (canOpenDepositSafe ? 'Zähle nur die Scheine aus allen Einzelkassen.' : 'Stückelung aus allen Einzelkassen.') : 'Übertrage diese Stückelung in EuroControl.'}</p>
    </div>

    {!preparation&&!calculation.valid&&<div className="mt-5 rounded-2xl border-2 border-red-400 bg-red-50 p-5 text-red-950">
      <strong className="text-xl">Die Summen passen nicht.</strong>
      <p className="mt-2">Scheine gezählt: <strong>{formatEuroFromCents(calculation.banknoteTotalCents)}</strong></p>
      <p>Erwartete Scheinsumme: <strong>{formatEuroFromCents(calculation.expectedBanknoteTotalCents)}</strong></p>
      <p className="mt-3 font-bold">Bitte prüfe die Scheine oder die Tageswerte.</p>
    </div>}

    {(preparation||calculation.valid)&&<>
      <div className="mt-6"><DenominationTable counts={shownCounts} editable={editable} onChange={onCountsChange}/></div>
      <div className="mt-4 rounded-2xl bg-white p-5 text-right"><span className="text-xs font-black uppercase tracking-wide text-black/45">{preparation ? 'Scheine aus Einzelkassen' : 'Buchungssumme'}</span><strong className="mt-1 block text-3xl text-[#800000]">{formatEuroFromCents(totalCents)}</strong></div>
    </>}

    {!preparation&&calculation.valid&&<div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
      <div className="rounded-xl bg-white p-4 text-center"><span className="text-xs font-black uppercase text-black/45">Bar an Bank</span><strong className="block text-xl">{formatEuroFromCents(calculation.roundedEurocontrolBankCents)}</strong></div>
      <strong className="text-center text-2xl">+</strong>
      <div className="rounded-xl bg-white p-4 text-center"><span className="text-xs font-black uppercase text-black/45">Abschöpfung</span><strong className="block text-xl">{formatEuroFromCents(calculation.skimCents)}</strong></div>
      <strong className="text-center text-2xl">=</strong>
      <div className="rounded-xl bg-emerald-50 p-4 text-center text-emerald-950"><span className="text-xs font-black uppercase opacity-55">Buchungssumme</span><strong className="block text-xl">{formatEuroFromCents(calculation.bookingTotalCents)}</strong></div>
    </div>}

    {preparation&&<button type="button" onClick={onSavePreparation} className="mt-6 min-h-14 w-full rounded-xl bg-[#800000] px-5 text-lg font-black text-white">{editable ? 'Scheine gezählt' : 'Zur Übersicht'}</button>}
    {!preparation&&calculation.valid&&<button type="button" onClick={onConfirmBooking} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#800000] px-5 text-lg font-black text-white"><CheckCircle2/>In EuroControl gebucht</button>}
    {!preparation&&!calculation.valid&&<button type="button" onClick={onBack} className="mt-6 min-h-14 w-full rounded-xl bg-[#800000] px-5 text-lg font-black text-white">Zurück und Angaben prüfen</button>}
  </div>;
}
