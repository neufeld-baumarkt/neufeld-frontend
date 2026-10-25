import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CircleAlert,
  ClipboardList,
  Landmark,
  LockKeyhole,
  ShieldAlert,
  X,
} from 'lucide-react';
import { CASH_DENOMINATIONS, TARGET_CENTS, formatEuroFromCents } from '../../lib/kasseneinzaehlung.mjs';
import {
  BANK_NOTE_CENTS,
  bankTotalCents,
  calculateClosingPlan,
  closingEquationCents,
  FLOAT_NOTE_CENTS,
  parseEuroToCents,
  requiresDifferenceNotification,
  suggestFloatNotes,
  validateBankNoteCounts,
} from '../../lib/kassenabrechnung.mjs';

const EMPTY = Object.freeze({});

function QuantityGrid({ denominations, counts, setCounts, submitSelector }) {
  const refs = useRef([]);
  const moveNext = (event, index) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const next = refs.current[index + 1]
      || event.currentTarget.closest('[role="dialog"]')?.querySelector(submitSelector);
    next?.focus();
    next?.select?.();
  };
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
    {denominations.map((item, index)=><label key={item.cents} className="rounded-xl border bg-[#faf9f7] p-3 text-center">
      <span className="text-sm font-black">{item.label}</span>
      <input ref={(node)=>{refs.current[index]=node;}} type="number" min="0" inputMode="numeric"
        enterKeyHint={index===denominations.length-1?'done':'next'} value={counts[item.cents]??''}
        onChange={(event)=>setCounts((current)=>({...current,[item.cents]:event.target.value}))}
        onKeyDown={(event)=>moveNext(event,index)} onFocus={(event)=>event.currentTarget.select()}
        className="mt-2 min-h-12 w-full rounded-lg border px-2 text-center text-lg font-bold outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/15" />
      <span className="mt-1 block text-xs text-black/45">= {formatEuroFromCents(item.cents*(Number(counts[item.cents])||0))}</span>
    </label>)}
  </div>;
}

function PinForm({ pin, setPin, onSubmit, busy, title, description }) {
  return <div className="mx-auto max-w-lg text-center">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#800000] text-white"><LockKeyhole size={32}/></div>
    <h3 className="mt-5 text-2xl font-black">{title}</h3><p className="mt-2 text-black/60">{description}</p>
    <form className="mt-6 text-left" onSubmit={onSubmit}><label className="text-sm font-bold">Persönlicher Mitarbeiter-PIN
      <input autoFocus type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin}
        onChange={(event)=>setPin(event.target.value.replace(/\D/g,'').slice(0,4))}
        className="mt-2 min-h-14 w-full rounded-xl border-2 border-black/15 px-4 text-center text-3xl font-black tracking-[.45em] outline-none focus:border-[#800000]" placeholder="••••" />
    </label><button disabled={busy||pin.length!==4} className="mt-5 min-h-12 w-full rounded-xl bg-[#800000] font-black text-white disabled:opacity-40">{busy?'PIN wird geprüft …':'PIN bestätigen'}</button></form>
  </div>;
}

const denomItems = (centsValues) => centsValues.map((cents)=>CASH_DENOMINATIONS.find((item)=>item.cents===cents));

export default function KassenabrechnungsModal({ branch, onClose, verifyPin, loadEmployees, loadContext, onComplete, presetOpening = null }) {
  const [stage,setStage]=useState('pin');
  const [pin,setPin]=useState('');
  const [employee,setEmployee]=useState(null);
  const [responsibleEmployee,setResponsibleEmployee]=useState(null);
  const [employees,setEmployees]=useState([]);
  const [drawerNumber,setDrawerNumber]=useState(null);
  const [opening,setOpening]=useState(null);
  const [contextProofToken,setContextProofToken]=useState('');
  const [fullCounts,setFullCounts]=useState(EMPTY);
  const [bankNotes,setBankNotes]=useState(EMPTY);
  const [differenceKind,setDifferenceKind]=useState('zero');
  const [differenceAmount,setDifferenceAmount]=useState('');
  const [differenceReviewed,setDifferenceReviewed]=useState(false);
  const [notificationConfirmed,setNotificationConfirmed]=useState(false);
  const [showFloatSuggestion,setShowFloatSuggestion]=useState(false);
  const [recountAttempts,setRecountAttempts]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState(null);
  const plan=useMemo(()=>calculateClosingPlan(fullCounts),[fullCounts]);
  const floatSuggestion=useMemo(()=>suggestFloatNotes({notesNeededCents:plan.notesNeededCents,fullCounts}),[plan.notesNeededCents,fullCounts]);
  const bankAmountCents=useMemo(()=>bankTotalCents(bankNotes),[bankNotes]);
  const differenceCents=useMemo(()=>{
    if(differenceKind==='zero') return 0;
    const cents=parseEuroToCents(differenceAmount);
    return cents===null?null:(differenceKind==='minus'?-cents:cents);
  },[differenceKind,differenceAmount]);

  useEffect(()=>{const close=(event)=>{if(event.key==='Escape'&&stage!=='complete')onClose();};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[onClose,stage]);
  const fail=(message)=>{setError(message);return false;};
  const advance=(next)=>{setError('');setStage(next);};

  const identify=async(event,final=false)=>{event.preventDefault();setError('');setBusy(true);try{
    const identified=await verifyPin(pin,{branch});
    if(final){
      if(String(identified.id)!==String(employee.id)) throw new Error('Der Abschluss muss mit demselben Mitarbeiter-PIN bestätigt werden.');
      const saved=await onComplete({drawerNumber,responsibleEmployeeId:responsibleEmployee.id,openingCountId:opening?.id||null,proceededWithoutOpening:!opening,fullCounts,looseChangeCents:plan.looseChangeCents,retainedCoinCents:plan.retainedCoinCents,bankNoteCounts:bankNotes,bankAmountCents,eurocontrolTotalCents:bankAmountCents,differenceCents,notificationConfirmed,recountAttempts,contextProofToken,proofToken:identified.proofToken});
      setResult(saved||{employee:identified});setStage('complete');
    } else {
      setEmployee(identified);
      if (presetOpening) {
        const responsible=presetOpening.employee;
        const context=await loadContext({drawerNumber:presetOpening.drawerNumber,employee:identified,responsibleEmployee:responsible});
        setResponsibleEmployee(responsible);setDrawerNumber(presetOpening.drawerNumber);
        setOpening(context?.opening||null);setContextProofToken(context?.contextProofToken||'');
        setStage(context?.opening?'full-count':'missing-opening');
      } else {
        const candidates=await loadEmployees();
        setResponsibleEmployee(identified);setEmployees(candidates);setStage('responsible');
      }
    }
    setPin('');
  }catch(failure){setError(failure.message);}finally{setBusy(false);}};

  const chooseResponsible=(candidate)=>{setResponsibleEmployee(candidate);advance('drawer');};
  const chooseDrawer=async(number)=>{setError('');setBusy(true);try{const context=await loadContext({drawerNumber:number,employee,responsibleEmployee});setDrawerNumber(number);setOpening(context?.opening||null);setContextProofToken(context?.contextProofToken||'');setStage(context?.opening?'full-count':'missing-opening');}catch(failure){setError(failure.message);}finally{setBusy(false);}};
  const checkFullCount=()=>{if(plan.countedTotalCents<=0)return fail('Bitte zuerst die komplette Lade zählen.');if(plan.countedTotalCents<TARGET_CENTS)return fail('Die gezählte Lade enthält weniger als 250,00 €. Bitte prüfe deine Eingaben.');advance('loose-change');};
  const checkBank=()=>{const problem=validateBankNoteCounts(fullCounts,bankNotes);if(problem)return fail(problem);const remainder=closingEquationCents({countedTotalCents:plan.countedTotalCents,bankAmountCents,looseChangeCents:plan.looseChangeCents});if(remainder!==TARGET_CENTS)return fail(`Die Kontrollrechnung ergibt ${formatEuroFromCents(remainder)} statt 250,00 €. Bitte zähle die übrigen Scheine erneut.`);advance('euro-transfer');};
  const checkDifference=()=>{if(differenceCents===null)return fail('Bitte gib die Differenz aus dem EuroControl-Protokoll centgenau ein. Punkt und Komma sind erlaubt.');if(differenceKind!=='zero'&&differenceCents===0)return fail('Wähle bei 0,00 € bitte „Keine Differenz“.');if(differenceKind!=='zero'&&!differenceReviewed)return fail('Bitte bestätige, dass du Vorzeichen und erkannten Differenzbetrag mit EuroControl verglichen hast.');if(requiresDifferenceNotification(differenceCents)&&!notificationConfirmed)return fail('Bei einer Einzelabweichung über 5,00 € müssen Alex und Peter informiert werden.');advance('review');};
  const restartAfterEuroControlWarning=()=>{
    setRecountAttempts((current)=>[...current,{fullCounts,bankNoteCounts:bankNotes,bankAmountCents,eurocontrolTotalCents:bankAmountCents,reportedDifferenceCents:differenceCents}]);
    setFullCounts({});setBankNotes({});setDifferenceKind('zero');setDifferenceAmount('');setDifferenceReviewed(false);setNotificationConfirmed(false);advance('full-count');
  };

  const stages=['pin','responsible','drawer','missing-opening','full-count','loose-change','float','bank','euro-transfer','euro-submit','difference','review','final-pin','complete'];
  const progress=Math.max(0,stages.indexOf(stage));
  const heading=(title,text)=><><h3 className="text-2xl font-black">{title}</h3><p className="mt-2 text-black/60">{text}</p></>;

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="cash-closing-title">
    <div className="flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-[#f7f4ef] text-black shadow-2xl sm:max-h-[94dvh] sm:rounded-3xl">
      <header className="flex items-center justify-between gap-3 bg-[#800000] px-4 py-4 text-white sm:px-6"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-white/65">Tageskassenabrechnung</div><h2 id="cash-closing-title" className="text-xl font-black sm:text-2xl">Kasse abrechnen</h2></div><button type="button" onClick={onClose} aria-label="Modal schließen" className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-white/10"><X/></button></header>
      <div className="h-1 bg-black/10"><div className="h-full bg-amber-400 transition-all" style={{width:`${((progress+1)/stages.length)*100}%`}}/></div>
      <div className="overflow-y-auto p-4 sm:p-7">
        <div className="mb-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Filiale: {branch}</span>{responsibleEmployee&&<span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Kassierer: {responsibleEmployee.name}</span>}{employee&&responsibleEmployee&&String(employee.id)!==String(responsibleEmployee.id)&&<span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-900 shadow-sm">Abgerechnet von: {employee.name}</span>}{drawerNumber&&<span className="rounded-full bg-white px-3 py-1.5 shadow-sm">Lade {drawerNumber}</span>}</div>
        {error&&<div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-800"><CircleAlert className="shrink-0" size={20}/>{error}</div>}
        {stage==='pin'&&<PinForm pin={pin} setPin={setPin} onSubmit={(event)=>identify(event)} busy={busy} title="Wer führt die Abrechnung durch?" description="Melde dich ausschließlich mit deinem eigenen persönlichen PIN an. Der PIN darf niemals weitergegeben oder für eine andere Person eingegeben werden."/>}
        {stage==='responsible'&&<div className="mx-auto max-w-2xl text-center">{heading('Wessen Kasse wird abgerechnet?','Du bist als ausführende Person angemeldet. Wähle jetzt den verantwortlichen Kassierer – dessen PIN wird dafür ausdrücklich nicht benötigt.')}<button onClick={()=>chooseResponsible(employee)} className="mt-6 min-h-16 w-full rounded-2xl bg-[#800000] px-5 text-lg font-black text-white">Meine eigene Kasse · {employee.name}</button><div className="my-5 flex items-center gap-3 text-xs font-black uppercase text-black/35"><span className="h-px flex-1 bg-black/10"/>oder Kasse einer anderen Person<span className="h-px flex-1 bg-black/10"/></div><div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{employees.filter((candidate)=>String(candidate.id)!==String(employee.id)).map((candidate)=><button key={candidate.id} onClick={()=>chooseResponsible(candidate)} className="min-h-14 rounded-xl border-2 border-black/10 bg-white px-4 font-bold hover:border-[#800000] hover:text-[#800000]">{candidate.name}</button>)}</div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">Die abwesende Person gibt ihren PIN niemals weiter. Diese Abrechnung wird dem Kassierer und dir als ausführender Person getrennt zugeordnet.</p></div>}
        {stage==='drawer'&&<div className="text-center">{heading('Welche Lade wird abgerechnet?',`Die App sucht ausschließlich nach der passenden Einzählung von ${responsibleEmployee.name} für diese Lade.`)}<div className="mx-auto mt-7 grid max-w-xl grid-cols-2 gap-4">{[1,2].map((number)=><button disabled={busy} key={number} onClick={()=>chooseDrawer(number)} className="aspect-square rounded-full border-4 border-[#800000]/20 bg-white text-2xl font-black text-[#800000] shadow-lg hover:border-[#800000]">Lade<br/><span className="text-6xl">{number}</span></button>)}</div></div>}
        {stage==='missing-opening'&&<div className="mx-auto max-w-2xl text-center"><ShieldAlert className="mx-auto text-amber-600" size={60}/>{heading('Keine passende Einzählung gefunden',`Für ${responsibleEmployee.name} und Lade ${drawerNumber} liegt heute keine passende Einzählung vor. Du darfst trotzdem abrechnen; dies wird sichtbar im Protokoll festgehalten.`)}<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"><button onClick={()=>advance('drawer')} className="min-h-12 rounded-xl border px-6 font-bold">Andere Lade wählen</button><button onClick={()=>advance('full-count')} className="min-h-12 rounded-xl bg-[#800000] px-6 font-black text-white">Trotzdem abrechnen</button></div></div>}
        {stage==='full-count'&&<div>{heading('1. Komplette Lade zählen','Zähle jetzt wirklich jede Münze und jeden Schein – von 1 Cent bis 200 Euro. Die App rechnet automatisch.')}<div className="mt-5"><QuantityGrid denominations={CASH_DENOMINATIONS} counts={fullCounts} setCounts={setFullCounts} submitSelector="[data-next-full]"/></div><div className="mt-4 rounded-2xl bg-white p-4 text-right"><span className="text-xs font-black uppercase text-black/45">Gesamtsumme Lade</span><strong className="block text-3xl text-[#800000]">{formatEuroFromCents(plan.countedTotalCents)}</strong></div></div>}
        {stage==='loose-change'&&<div className="mx-auto max-w-2xl text-center"><Landmark className="mx-auto text-[#800000]" size={58}/>{heading('2. Kleingeld in den Tresor legen','Die App hat dein gezähltes Münzgeld auf den nächsten vollen Fünfer abgerundet. Führe jetzt genau diese Entnahme aus.')}<div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white p-5"><span className="text-xs font-black uppercase text-black/45">In der Lade behalten</span><strong className="mt-1 block text-3xl">{formatEuroFromCents(plan.retainedCoinCents)}</strong></div><div className="rounded-2xl bg-amber-100 p-5 text-amber-900"><span className="text-xs font-black uppercase">Jetzt in den Tresor legen</span><strong className="mt-1 block text-3xl">{formatEuroFromCents(plan.looseChangeCents)}</strong></div></div><button onClick={()=>advance('float')} className="mt-6 min-h-12 rounded-xl bg-[#800000] px-7 font-black text-white">Kleingeld entnommen</button></div>}
        {stage==='float'&&<div className="mx-auto max-w-2xl text-center">{heading('3. Lade auf 250,00 € hochzählen',`Beginne bei ${formatEuroFromCents(plan.retainedCoinCents)} und zähle mit den tatsächlichen Werten der 5-, 10- und 20-Euro-Scheine bis exakt 250,00 € hoch. Achte auf eine sinnvolle Mischung für das Wechselgeld.`)}<div className="mt-6 rounded-2xl bg-white p-5"><span className="text-xs font-black uppercase text-black/45">Aufzählung starten bei</span><strong className="mt-1 block text-3xl text-[#800000]">{formatEuroFromCents(plan.retainedCoinCents)}</strong></div>{showFloatSuggestion&&<div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-left"><div className="text-center"><span className="text-xs font-black uppercase tracking-wide text-amber-800">Unverbindlicher Vorschlag</span><p className="mt-1 text-sm text-amber-950/70">Du kannst diese Mischung verwenden oder weiterhin selbstständig auf 250,00 € hochzählen.</p></div>{floatSuggestion?<div className="mt-4 grid grid-cols-3 gap-2">{FLOAT_NOTE_CENTS.map((cents)=><div key={cents} className="rounded-xl bg-white p-3 text-center shadow-sm"><strong className="block text-2xl text-[#800000]">{floatSuggestion.counts[cents]}</strong><span className="text-sm font-bold">× {formatEuroFromCents(cents)}</span><span className="mt-1 block text-xs text-black/45">{formatEuroFromCents(floatSuggestion.counts[cents]*cents)}</span></div>)}</div>:<p className="mt-4 rounded-xl bg-white p-4 text-center font-bold text-amber-900">Mit den gezählten 5-, 10- und 20-Euro-Scheinen ist kein exakter Vorschlag möglich. Bitte zähle selbstständig hoch.</p>}</div>}<div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center"><button onClick={()=>setShowFloatSuggestion((current)=>!current)} className="min-h-12 rounded-xl border-2 border-[#800000] bg-white px-6 font-black text-[#800000]">{showFloatSuggestion?'Vorschlag ausblenden':'Stückelung vorschlagen'}</button><button onClick={()=>advance('bank')} className="min-h-12 rounded-xl bg-[#800000] px-7 font-black text-white">Lade auf 250,00 € hochgezählt</button></div></div>}
        {stage==='bank'&&<div>{heading('4. Übrige Scheine erneut zählen','Nimm alle übrigen Scheine aus der Lade und zähle sie jetzt noch einmal unabhängig. Trage nur diese Scheine als „Bar an Bank“ ein. Die App prüft danach die vollständige 250-Euro-Gleichung.')}<div className="mt-5"><QuantityGrid denominations={denomItems(BANK_NOTE_CENTS)} counts={bankNotes} setCounts={(updater)=>{setBankNotes(updater);setError('');}} submitSelector="[data-next-bank]"/></div><div className="mt-4 rounded-2xl bg-white p-4 text-right"><span className="text-xs font-black uppercase text-black/45">Bar an Bank</span><strong className="block text-3xl text-[#800000]">{formatEuroFromCents(bankAmountCents)}</strong></div></div>}
        {stage==='euro-transfer'&&<div className="mx-auto max-w-2xl"><div className="text-center"><ClipboardList className="mx-auto text-[#800000]" size={58}/>{heading('5. Werte in EuroControl eingeben','Übertrage die vollständige Kassenzählung genauso in EuroControl. Die Liste zeigt dir alle ursprünglich gezählten Stückelungen von 1 Cent bis 200 Euro.')}</div><div className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"><div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-black/5 px-4 py-3 text-xs font-black uppercase tracking-wide text-black/50"><span>Stückelung</span><span className="text-right">Anzahl</span><span className="min-w-24 text-right">Betrag</span></div>{CASH_DENOMINATIONS.map((item)=>{const quantity=Number(fullCounts[item.cents])||0;return <div key={item.cents} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t border-black/10 px-4 py-3 text-lg"><strong>{item.label}</strong><span className="min-w-14 rounded-lg bg-[#f7f4ef] px-3 py-1 text-center font-black">{quantity}</span><strong className="min-w-24 text-right text-[#800000]">{formatEuroFromCents(item.cents*quantity)}</strong></div>;})}<div className="flex items-center justify-between gap-4 border-t-2 border-[#800000]/20 bg-amber-50 px-4 py-4"><span className="font-black">Gesamtsumme Kasse</span><strong className="text-2xl text-[#800000]">{formatEuroFromCents(plan.countedTotalCents)}</strong></div></div><button onClick={()=>advance('euro-submit')} className="mt-5 min-h-12 w-full rounded-xl bg-[#800000] px-5 font-black text-white">Alles in EuroControl eingetragen</button></div>}
        {stage==='euro-submit'&&<div className="mx-auto max-w-2xl text-center"><Check className="mx-auto text-emerald-700" size={60}/>{heading('6. EuroControl-Abrechnung ausführen',`Die übertragenen Bar-an-Bank-Werte ergeben ${formatEuroFromCents(bankAmountCents)}. Klicke jetzt in EuroControl auf „Eingabe übernehmen“. Wenn EuroControl eine auffällige Differenz meldet, kannst du dort abbrechen und die Kasse erneut zählen.`)}<button onClick={()=>advance('difference')} className="mt-6 min-h-12 rounded-xl bg-emerald-700 px-7 font-black text-white">Eingabe übernommen – Ergebnis wird angezeigt</button></div>}
        {stage==='difference'&&<div className="mx-auto max-w-xl">{heading('7. Differenz aus EuroControl übernehmen','Wähle das Vorzeichen genauso, wie es EuroControl anzeigt, und trage den Betrag ein. Punkt und Komma werden beide als Dezimalzeichen akzeptiert.')}<div className="mt-5 grid grid-cols-3 gap-2">{[['minus','− Minus'],['zero','Keine'],['plus','+ Plus']].map(([value,label])=><button key={value} onClick={()=>{setDifferenceKind(value);setDifferenceReviewed(false);setNotificationConfirmed(false);}} className={`min-h-12 rounded-xl border-2 font-black ${differenceKind===value?'border-[#800000] bg-[#800000] text-white':'bg-white'}`}>{label}</button>)}</div>{differenceKind!=='zero'&&<label className="mt-4 block text-sm font-bold">Betrag der Differenz<input autoFocus inputMode="decimal" value={differenceAmount} onChange={(event)=>{setDifferenceAmount(event.target.value);setDifferenceReviewed(false);setNotificationConfirmed(false);}} placeholder="0,00 oder 0.00" className="mt-2 min-h-14 w-full rounded-xl border-2 px-4 text-right text-2xl font-black outline-none focus:border-[#800000]"/></label>}{differenceKind!=='zero'&&differenceCents!==null&&<div className={`mt-4 rounded-xl border-2 p-4 ${requiresDifferenceNotification(differenceCents)?'border-amber-400 bg-amber-50 text-amber-950':'border-emerald-300 bg-emerald-50 text-emerald-950'}`}><span className="text-xs font-black uppercase">Von der App erkannt</span><strong className="mt-1 block text-3xl">{formatEuroFromCents(differenceCents,{signed:true})}</strong>{requiresDifferenceNotification(differenceCents)&&<p className="mt-2 text-sm font-bold">Dieser Betrag ist größer als 5,00 €. Prüfe Dezimalzeichen und Vorzeichen bitte besonders sorgfältig.</p>}</div>}{differenceKind!=='zero'&&differenceCents!==null&&<label className="mt-4 flex items-start gap-3 rounded-xl border bg-white p-4 font-bold"><input type="checkbox" checked={differenceReviewed} onChange={(event)=>setDifferenceReviewed(event.target.checked)} className="mt-1 h-5 w-5 accent-[#800000]"/><span>Ich habe Vorzeichen und den erkannten Betrag mit dem EuroControl-Protokoll verglichen.</span></label>}{requiresDifferenceNotification(differenceCents)&&<label className="mt-4 flex items-start gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 font-bold text-amber-950"><input type="checkbox" checked={notificationConfirmed} onChange={(event)=>setNotificationConfirmed(event.target.checked)} className="mt-1 h-5 w-5 accent-[#800000]"/><span>Ich bestätige, dass Alex und Peter wegen der Einzelabweichung über 5,00 € informiert wurden.</span></label>}<div className={`mt-5 grid gap-3 ${differenceKind!=='zero'?'sm:grid-cols-2':''}`}>{differenceKind!=='zero'&&<button onClick={restartAfterEuroControlWarning} className="min-h-12 rounded-xl border-2 border-[#800000] bg-white px-4 font-black text-[#800000]">In EuroControl abgebrochen – neu zählen</button>}<button onClick={checkDifference} className="min-h-12 rounded-xl bg-[#800000] px-4 font-black text-white">Differenz übernehmen</button></div>{recountAttempts.length>0&&<p className="mt-3 text-center text-sm font-bold text-black/50">Bisherige Neuzählungen in diesem Vorgang: {recountAttempts.length}</p>}</div>}
        {stage==='review'&&<div className="mx-auto max-w-2xl text-center">{heading('8. Abrechnung vollständig prüfen','Kontrolliere alle Angaben, bevor du die Abrechnung mit deinem eigenen PIN verbindlich speicherst.')}<div className="mt-6 grid gap-3 rounded-2xl bg-white p-5 text-left sm:grid-cols-2"><div><span className="text-xs font-black uppercase text-black/45">Verantwortlicher Kassierer</span><strong className="block text-lg">{responsibleEmployee.name}</strong></div><div><span className="text-xs font-black uppercase text-black/45">Abgerechnet von</span><strong className="block text-lg">{employee.name}</strong></div><div><span className="text-xs font-black uppercase text-black/45">Lade</span><strong className="block text-lg">Lade {drawerNumber}</strong></div><div><span className="text-xs font-black uppercase text-black/45">Einzählung</span><strong className="block text-lg">{opening?'Zugeordnet':'Nicht vorhanden'}</strong></div><div><span className="text-xs font-black uppercase text-black/45">Gesamtsumme Kasse</span><strong className="block text-2xl">{formatEuroFromCents(plan.countedTotalCents)}</strong></div><div><span className="text-xs font-black uppercase text-black/45">Gesamtsumme Bar an Bank</span><strong className="block text-2xl">{formatEuroFromCents(bankAmountCents)}</strong></div><div className="sm:col-span-2"><span className="text-xs font-black uppercase text-black/45">Differenz der Kasse</span><strong className={`block text-3xl ${differenceCents===0?'text-emerald-700':'text-[#800000]'}`}>{formatEuroFromCents(differenceCents,{signed:true})}</strong></div></div><div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center"><button onClick={()=>advance('difference')} className="min-h-12 rounded-xl border px-6 font-bold"><ArrowLeft className="mr-2 inline" size={18}/>Differenz korrigieren</button><button onClick={()=>{setPin('');advance('final-pin');}} className="min-h-12 rounded-xl bg-[#800000] px-7 font-black text-white">Alle Angaben geprüft</button></div></div>}
        {stage==='final-pin'&&<PinForm pin={pin} setPin={setPin} onSubmit={(event)=>identify(event,true)} busy={busy} title="Abrechnung verbindlich abschließen" description="Bestätige die vollständige Abrechnung noch einmal mit deinem persönlichen PIN. Danach ist sie unveränderbar."/>}
        {stage==='complete'&&<div className="mx-auto max-w-2xl text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white"><Check size={46}/></div>{heading('Kasse ist abgerechnet','Die Abrechnung wurde verbindlich gespeichert und kann später nur noch gelesen werden.')}<div className="mt-6 grid gap-3 rounded-2xl bg-white p-5 text-left sm:grid-cols-2"><div><span className="text-xs font-black uppercase text-black/45">Gesamtsumme Kasse</span><strong className="block text-2xl">{formatEuroFromCents(plan.countedTotalCents)}</strong></div><div><span className="text-xs font-black uppercase text-black/45">Gesamtsumme Bar an Bank</span><strong className="block text-2xl">{formatEuroFromCents(bankAmountCents)}</strong></div><div><span className="text-xs font-black uppercase text-black/45">Differenz der Kasse</span><strong className="block text-2xl">{formatEuroFromCents(differenceCents,{signed:true})}</strong></div><div><span className="text-xs font-black uppercase text-black/45">Einzählung</span><strong className="block">{opening?'Zugeordnet':'Nicht vorhanden'}</strong></div><div className="sm:col-span-2"><span className="text-xs font-black uppercase text-black/45">Status</span><strong className="block text-emerald-700">Abgeschlossen · Read-only</strong></div></div><button onClick={onClose} className="mt-6 min-h-12 rounded-xl bg-emerald-700 px-7 font-black text-white">Fertig</button></div>}
      </div>
      {['full-count','bank'].includes(stage)&&<footer className="flex flex-col-reverse gap-3 border-t bg-white px-4 py-4 sm:flex-row sm:justify-between sm:px-7"><button onClick={()=>advance(stage==='full-count'?(opening?'drawer':'missing-opening'):'float')} className="min-h-12 rounded-xl border px-5 font-bold"><ArrowLeft className="mr-2 inline" size={18}/>Zurück</button><button data-next-full={stage==='full-count'||undefined} data-next-bank={stage==='bank'||undefined} onClick={stage==='full-count'?checkFullCount:checkBank} className="min-h-12 rounded-xl bg-[#800000] px-6 font-black text-white">{stage==='bank'?'Bar an Bank prüfen':'Weiter'}</button></footer>}
    </div>
  </div>;
}

