import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, FileCheck2, LoaderCircle, ReceiptText, RotateCcw, X } from 'lucide-react';
import {
  emptyReceiptCounts,
  formatEuroCents,
  germanMoneyToCents,
  matchingClosingSets,
  parseDepositReceiptText,
  prepareReceiptImage,
  mergeReceiptRecognition,
  receiptRecognitionScore,
  RECEIPT_NOTE_CENTS,
  receiptBanknoteTotalCents,
  validateReceiptReview,
} from '../../lib/einzahlungsbeleg.mjs';

const noteLabel = (cents) => `${cents / 100} €`;
const dateLabel = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('de-DE') : '–';
const centsInput = (cents) => Number.isInteger(cents) ? (cents / 100).toFixed(2).replace('.', ',') : '';

export default function EinzahlungsbelegModal({ branch, closings, onClose, onConfirm }) {
  const [stage, setStage] = useState('capture');
  const [previewUrl, setPreviewUrl] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [receipt, setReceipt] = useState({
    depositDate: '', depositTime: '', transactionNumber: '', terminalNumber: '', purpose: '',
    banknoteCounts: emptyReceiptCounts(), receiptTotalCents: null, ocrConfidence: 0,
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [receiptTotalInput, setReceiptTotalInput] = useState('');
  const [onedriveConfirmed, setOnedriveConfirmed] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    workerRef.current?.terminate?.().catch?.(() => {});
  }, [previewUrl]);

  const selectedClosings = useMemo(
    () => closings.filter((closing) => selectedIds.includes(closing.id)),
    [closings, selectedIds]
  );
  const selectedTotalCents = selectedClosings.reduce((sum, closing) => sum + Number(closing.expectedDepositCents || 0), 0);
  const countedTotalCents = receiptBanknoteTotalCents(receipt.banknoteCounts);
  const amountMatches = selectedClosings.length > 0 && selectedTotalCents === receipt.receiptTotalCents;

  const photograph = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    setStage('recognizing');
    setOcrProgress(0);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    let worker;
    try {
      const preparedImage = await prepareReceiptImage(file);
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('deu', 1, {
        logger(message) {
          if (message.status === 'recognizing text') setOcrProgress(Math.round((message.progress || 0) * 100));
        },
      });
      workerRef.current = worker;
      await worker.setParameters({ tessedit_pageseg_mode:'3', preserve_interword_spaces:'1' });
      const result = await worker.recognize(preparedImage);
      let parsed = parseDepositReceiptText(result.data.text);
      let confidence = result.data.confidence || 0;
      if (receiptRecognitionScore(parsed) < 8) {
        setOcrProgress(0);
        await worker.setParameters({ tessedit_pageseg_mode:'6', preserve_interword_spaces:'1' });
        const fallbackResult = await worker.recognize(file);
        parsed = mergeReceiptRecognition(parsed, parseDepositReceiptText(fallbackResult.data.text));
        confidence = Math.max(confidence, fallbackResult.data.confidence || 0);
      }
      const next = { ...parsed, ocrConfidence: Math.max(0, Math.min(100, confidence)) };
      setReceipt(next);
      setReceiptTotalInput(centsInput(next.receiptTotalCents));
      const matches = matchingClosingSets(closings, next.receiptTotalCents);
      setSelectedIds(matches.length === 1 ? matches[0] : []);
      setStage('review');
    } catch (failure) {
      setReceipt((current) => ({ ...current, banknoteCounts: current.banknoteCounts || emptyReceiptCounts() }));
      setError('Der Beleg konnte nicht vollständig gelesen werden. Bitte trage die markierten Angaben ein oder fotografiere ihn erneut.');
      setStage('review');
    } finally {
      await worker?.terminate?.().catch(() => {});
      workerRef.current = null;
      setBusy(false);
    }
  };

  const toggleClosing = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setOnedriveConfirmed(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    const errors = validateReceiptReview(receipt, selectedClosings, onedriveConfirmed);
    if (pin.length !== 4) errors.push('Persönlichen PIN eingeben.');
    if (errors.length) return setError(errors.join(' '));
    setBusy(true);
    setError('');
    try {
      await onConfirm({
        branch,
        closingIds: selectedIds,
        ...receipt,
        onedriveConfirmed: true,
        pin,
      });
      setPin('');
      setStage('complete');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-2 sm:p-5" role="dialog" aria-modal="true" aria-label="Einzahlungsbeleg erfassen">
    <div className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[#f5f1ec] text-[#242020] shadow-2xl">
      <header className="flex items-center justify-between border-b-4 border-amber-400 bg-[#990000] px-5 py-4 text-white sm:px-7">
        <div><div className="text-xs font-black uppercase tracking-[.2em] text-white/70">Tageskassenabrechnung</div><h2 className="text-2xl font-black">Einzahlungsbeleg</h2></div>
        <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="Schließen"><X/></button>
      </header>
      <div className="overflow-y-auto p-5 sm:p-7">
        <div className="mb-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black shadow-sm">Filiale: {branch}</div>
        {error && <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 font-bold text-red-800">{error}</div>}

        {stage === 'capture' && <section className="mx-auto max-w-xl text-center">
          <ReceiptText className="mx-auto text-[#990000]" size={64}/>
          <h3 className="mt-4 text-3xl font-black">Beleg fotografieren</h3>
          <p className="mt-2 text-lg text-black/60">Lege den Beleg flach hin. Der ganze Beleg muss gut lesbar sein.</p>
          <label className="mt-7 flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-2xl bg-[#990000] px-6 text-xl font-black text-white">
            <Camera/> Kamera öffnen
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={photograph}/>
          </label>
          <p className="mt-4 text-sm text-black/45">Das Foto wird nur auf diesem Gerät ausgewertet und nicht dauerhaft gespeichert.</p>
        </section>}

        {stage === 'recognizing' && <section className="mx-auto max-w-xl py-12 text-center">
          <LoaderCircle className="mx-auto animate-spin text-[#990000]" size={64}/>
          <h3 className="mt-5 text-2xl font-black">Beleg wird gelesen …</h3>
          <div className="mx-auto mt-5 h-3 max-w-md overflow-hidden rounded-full bg-black/10"><div className="h-full bg-amber-400 transition-all" style={{width:`${ocrProgress}%`}}/></div>
          <p className="mt-2 font-bold">{ocrProgress} %</p>
        </section>}

        {stage === 'review' && <form onSubmit={submit}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
            <section>
              {previewUrl && <img src={previewUrl} alt="Fotografierter Einzahlungsbeleg" className="max-h-[540px] w-full rounded-2xl bg-white object-contain p-2 shadow"/>}
              <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-black/10 bg-white font-black">
                <RotateCcw size={18}/> Neu fotografieren
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={photograph}/>
              </label>
            </section>
            <section>
              <h3 className="text-2xl font-black">Erkannte Angaben prüfen</h3>
              <p className="mt-1 text-black/55">Falsche Werte bitte direkt korrigieren.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="font-bold">Einzahlungsdatum<input type="date" value={receipt.depositDate} onChange={(event)=>setReceipt({...receipt,depositDate:event.target.value})} className="mt-1 min-h-12 w-full rounded-xl border px-3"/></label>
                <label className="font-bold">Uhrzeit<input type="time" value={receipt.depositTime} onChange={(event)=>setReceipt({...receipt,depositTime:event.target.value})} className="mt-1 min-h-12 w-full rounded-xl border px-3"/></label>
                <label className="font-bold">Transaktionsnummer<input inputMode="numeric" value={receipt.transactionNumber} onChange={(event)=>setReceipt({...receipt,transactionNumber:event.target.value.replace(/\D/g,'')})} className="mt-1 min-h-12 w-full rounded-xl border px-3"/></label>
                <label className="font-bold">Terminalnummer<input inputMode="numeric" value={receipt.terminalNumber} onChange={(event)=>setReceipt({...receipt,terminalNumber:event.target.value.replace(/\D/g,'')})} className="mt-1 min-h-12 w-full rounded-xl border px-3"/></label>
              </div>
              <label className="mt-3 block font-bold">Verwendungszweck <span className="font-normal text-black/45">(optional)</span><input value={receipt.purpose} onChange={(event)=>setReceipt({...receipt,purpose:event.target.value})} maxLength={120} className="mt-1 min-h-12 w-full rounded-xl border px-3"/></label>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {RECEIPT_NOTE_CENTS.map((cents)=><label key={cents} className="rounded-xl bg-white p-3 text-center font-black shadow-sm">{noteLabel(cents)}
                  <input type="number" min="0" inputMode="numeric" value={receipt.banknoteCounts[cents] ?? 0}
                    onChange={(event)=>setReceipt({...receipt,banknoteCounts:{...receipt.banknoteCounts,[cents]:Math.max(0,Math.trunc(Number(event.target.value)||0))}})}
                    className="mt-2 min-h-11 w-full rounded-lg border text-center text-lg font-black"/>
                </label>)}
              </div>
              <div className="mt-3 rounded-2xl bg-white p-4">
                <label className="font-black">Belegsumme<input inputMode="decimal" value={receiptTotalInput}
                  onChange={(event)=>{setReceiptTotalInput(event.target.value);setReceipt({...receipt,receiptTotalCents:germanMoneyToCents(event.target.value)});}}
                  className="mt-1 min-h-12 w-full rounded-xl border-2 border-[#990000] px-3 text-right text-2xl font-black"/></label>
                <div className={`mt-2 text-sm font-bold ${countedTotalCents===receipt.receiptTotalCents?'text-emerald-700':'text-red-700'}`}>Scheine ergeben: {formatEuroCents(countedTotalCents)}</div>
              </div>
            </section>
          </div>

          <section className="mt-7 rounded-2xl bg-white p-4 sm:p-5">
            <h3 className="text-xl font-black">Welcher Tagesabschluss gehört zum Beleg?</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {closings.map((closing)=><label key={closing.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 ${selectedIds.includes(closing.id)?'border-amber-400 bg-amber-50':'border-black/10'}`}>
                <input type="checkbox" checked={selectedIds.includes(closing.id)} onChange={()=>toggleClosing(closing.id)} className="h-6 w-6 accent-[#990000]"/>
                <span><strong className="block">Geschäftstag {dateLabel(closing.businessDate)}</strong><span>{formatEuroCents(closing.expectedDepositCents)}</span></span>
              </label>)}
            </div>
            <div className={`mt-4 rounded-xl p-4 font-black ${amountMatches?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-900'}`}>
              {amountMatches ? 'Betrag stimmt mit dem Tagesabschluss überein.' : `Ausgewählt: ${formatEuroCents(selectedTotalCents)} · Beleg: ${formatEuroCents(receipt.receiptTotalCents)}`}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
            <h3 className="text-xl font-black">Beleg jetzt wie gewohnt einscannen</h3>
            <p className="mt-1 text-black/65">Speichere den Scan im bisherigen OneDrive-Ordner.</p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 font-bold"><input type="checkbox" checked={onedriveConfirmed} onChange={(event)=>setOnedriveConfirmed(event.target.checked)} className="mt-0.5 h-6 w-6 accent-[#990000]"/>Ich habe den Beleg in OneDrive gespeichert.</label>
          </section>

          <section className="mx-auto mt-5 max-w-md">
            <label className="font-black">Mit persönlichem PIN bestätigen<input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(event)=>setPin(event.target.value.replace(/\D/g,'').slice(0,4))} className="mt-2 min-h-14 w-full rounded-xl border-2 px-4 text-center text-3xl font-black tracking-[.4em]" placeholder="••••"/></label>
            <button disabled={busy} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#990000] px-5 text-lg font-black text-white disabled:opacity-50"><FileCheck2/>{busy?'Wird gespeichert …':'Beleg verbindlich zuordnen'}</button>
          </section>
        </form>}

        {stage === 'complete' && <section className="py-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white"><Check size={48}/></div>
          <h3 className="mt-5 text-3xl font-black">Beleg ist zugeordnet</h3>
          <p className="mt-2 text-lg text-black/60">Die Belegdaten sind gespeichert. Das Kamerafoto wurde verworfen.</p>
          <button type="button" onClick={onClose} className="mt-7 min-h-12 rounded-xl bg-emerald-700 px-8 font-black text-white">Fertig</button>
        </section>}
      </div>
    </div>
  </div>;
}
