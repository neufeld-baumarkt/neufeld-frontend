import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Landmark } from 'lucide-react';
import { formatEuroFromCents } from '../../lib/kasseneinzaehlung.mjs';
import { COIN_ROLLS, SAFE_NOTES, calculateSafeCount } from '../../lib/tresorzaehlung.mjs';
import { parseMoneyToCents } from '../../lib/tagesabschlussV2.mjs';

function CountInput({ label, value, result, onChange, onEnter }) {
  return <label className="rounded-2xl border-2 border-black/10 bg-white p-3 text-center font-black">
    <span>{label}</span>
    <input
      inputMode="numeric"
      value={value || ''}
      onChange={(event)=>onChange(event.target.value)}
      onKeyDown={(event)=>{if(event.key==='Enter'){event.preventDefault();onEnter?.();}}}
      className="mt-2 min-h-12 w-full rounded-xl border-2 border-black/10 px-3 text-center text-lg font-black outline-none focus:border-[#800000]"
    />
    <span className="mt-1 block text-sm font-normal text-black/50">{formatEuroFromCents(result)}</span>
  </label>;
}

export default function TresorabschlussV2Process({ mode, transferCents, safeTargetCents, fixedDrawerCents, littleBerthaCents, onConfirmMovement, onSaveCount, onBack }) {
  const [looseMoney, setLooseMoney] = useState('');
  const [looseError, setLooseError] = useState('');
  const [rollCounts, setRollCounts] = useState({});
  const [noteCounts, setNoteCounts] = useState({});
  const inputRefs = useRef([]);
  const looseMoneyCents = parseMoneyToCents(looseMoney);
  const result = useMemo(() => calculateSafeCount({
    fixedDrawerCents,
    littleBerthaCents,
    looseMoneyCents: Number.isInteger(looseMoneyCents) ? looseMoneyCents : 0,
    coinRollCounts: rollCounts,
    banknoteCounts: noteCounts,
  }), [fixedDrawerCents, littleBerthaCents, looseMoneyCents, noteCounts, rollCounts]);
  const differenceCents = Number.isInteger(safeTargetCents) ? result.countedTotalCents - safeTargetCents : null;
  const updateCount = (setter, key, value) => setter((current)=>({ ...current, [key]: Number(String(value).replace(/\D/g, '') || 0) }));
  const saveCount = () => {
    if (!Number.isInteger(looseMoneyCents)) {
      setLooseError('Bitte loses Geld eingeben.');
      return;
    }
    setLooseError('');
    onSaveCount?.({ ...result, looseMoneyCents, rollCounts, noteCounts, differenceCents });
  };

  if (mode === 'safe-movement') return <div className="mx-auto max-w-3xl text-center">
    <button type="button" onClick={onBack} className="mb-5 flex min-h-11 items-center gap-2 rounded-xl px-3 font-black text-black/60"><ArrowLeft size={19}/>Zur Übersicht</button>
    <Landmark className="mx-auto text-[#800000]" size={58}/>
    <h3 className="mt-4 text-2xl font-black sm:text-3xl">Geld aus dem Tresor nehmen</h3>
    <div className="mt-6 rounded-2xl bg-[#800000] p-6 text-white">
      <p className="text-xl font-black sm:text-3xl">Nimm {formatEuroFromCents(transferCents)} aus dem Tresor und lege es zu Bar an Bank dazu.</p>
    </div>
    <button type="button" onClick={onConfirmMovement} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-lg font-black text-white"><CheckCircle2/>Erledigt</button>
  </div>;

  const nextRef = (index) => inputRefs.current[index + 1]?.focus();
  return <div className="mx-auto max-w-4xl">
    <button type="button" onClick={onBack} className="mb-5 flex min-h-11 items-center gap-2 rounded-xl px-3 font-black text-black/60"><ArrowLeft size={19}/>Zur Übersicht</button>
    <div className="text-center"><Landmark className="mx-auto text-[#800000]" size={54}/><h3 className="mt-3 text-2xl font-black sm:text-3xl">Tresor zählen</h3></div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl bg-white p-4"><span className="text-xs font-black uppercase text-black/45">2 Kassenladen</span><strong className="block text-2xl">{formatEuroFromCents(fixedDrawerCents)}</strong></div>
      <div className="rounded-2xl bg-white p-4"><span className="text-xs font-black uppercase text-black/45">Little Bertha</span><strong className="block text-2xl">{formatEuroFromCents(littleBerthaCents)}</strong></div>
    </div>

    <label className="mt-4 block text-sm font-black">Loses Geld
      <input ref={(element)=>{inputRefs.current[0]=element;}} value={looseMoney} onChange={(event)=>setLooseMoney(event.target.value)} onKeyDown={(event)=>{if(event.key==='Enter'){event.preventDefault();nextRef(0);}}} inputMode="decimal" placeholder="0,00" className={`mt-2 min-h-14 w-full rounded-xl border-2 bg-white px-4 text-xl font-black outline-none focus:border-[#800000] ${looseError ? 'border-red-500' : 'border-black/10'}`}/>
      {looseError&&<span className="mt-1 block text-sm text-red-700">{looseError}</span>}
    </label>

    <h4 className="mb-3 mt-6 text-xl font-black">Münzrollen</h4>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {COIN_ROLLS.map((item,itemIndex)=>{const index=itemIndex+1;return <div key={item.cents} ref={(element)=>{const input=element?.querySelector('input');if(input)inputRefs.current[index]=input;}}><CountInput label={item.label} value={rollCounts[item.cents]} result={(rollCounts[item.cents]||0)*item.rollValueCents} onChange={(value)=>updateCount(setRollCounts,item.cents,value)} onEnter={()=>nextRef(index)}/></div>;})}
    </div>

    <h4 className="mb-3 mt-6 text-xl font-black">Scheine</h4>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {SAFE_NOTES.map((item,itemIndex)=>{const index=COIN_ROLLS.length+1+itemIndex;return <div key={item.cents} ref={(element)=>{const input=element?.querySelector('input');if(input)inputRefs.current[index]=input;}}><CountInput label={item.label} value={noteCounts[item.cents]} result={(noteCounts[item.cents]||0)*item.cents} onChange={(value)=>updateCount(setNoteCounts,item.cents,value)} onEnter={()=>nextRef(index)}/></div>;})}
    </div>

    <div className={`mt-6 rounded-2xl border-2 p-5 ${differenceCents === 0 ? 'border-emerald-400 bg-emerald-50 text-emerald-950' : 'border-amber-400 bg-amber-50 text-amber-950'}`}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><span className="text-xs font-black uppercase opacity-50">Gezählt</span><strong className="block text-2xl">{formatEuroFromCents(result.countedTotalCents)}</strong></div>
        <div><span className="text-xs font-black uppercase opacity-50">EuroControl-SOLL</span><strong className="block text-2xl">{formatEuroFromCents(safeTargetCents)}</strong></div>
        <div><span className="text-xs font-black uppercase opacity-50">Differenz</span><strong className="block text-2xl">{Number.isInteger(differenceCents) ? formatEuroFromCents(differenceCents,{signed:true}) : '—'}</strong></div>
      </div>
    </div>
    <button type="button" onClick={saveCount} className="mt-6 min-h-14 w-full rounded-xl bg-[#800000] px-5 text-lg font-black text-white">Tresorzählung speichern</button>
  </div>;
}
