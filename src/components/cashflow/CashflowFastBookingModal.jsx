import { useEffect, useRef, useState } from 'react';
import { calculatePlannedInvoiceAmount } from '../../lib/cashflowUi.mjs';

const FILIALEN = ['Ahaus', 'Münster', 'Telgte', 'Vreden', 'Verwaltung', 'Unternehmen'];

function isValidInput(value) {
  const trimmed = String(value || '').trim();

  if (!trimmed) return false;

  if (trimmed.toLowerCase() === 'feiertag') return true;

  const normalized = trimmed.replace(',', '.');
  return !Number.isNaN(Number(normalized));
}

export default function CashflowFastBookingModal({
  isOpen,
  onClose,
  context,
  onMockSave,
}) {
  const [value, setValue] = useState('');
  const [useSkonto, setUseSkonto] = useState(false);
  const [skontoRate, setSkontoRate] = useState(2);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setValue('');
    setUseSkonto(false);
    setSkontoRate(2);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !context) return null;

  const canSave = isValidInput(value);
  const isEinnahme = Boolean(context.isEinnahme);

  const buildPayload = (filiale) => {
    const trimmed = value.trim();
    const isFeiertag = trimmed.toLowerCase() === 'feiertag';

    const originalAmount = isFeiertag ? 0 : Number(trimmed.replace(',', '.'));
    const plannedAmount = useSkonto
      ? calculatePlannedInvoiceAmount(originalAmount, skontoRate)
      : originalAmount;

    return {
      ...context,
      filiale,
      eintrag_typ: isFeiertag ? 'feiertag' : 'betrag',
      betrag: plannedAmount,
      rechnungsbetrag_brutto: isFeiertag || isEinnahme ? undefined : originalAmount,
      skonto_prozent: isFeiertag || isEinnahme ? undefined : useSkonto ? skontoRate : 0,
      status: 'angekuendigt',
      notiz: null,
    };
  };

  const savePayload = (payload) => {
    console.log('Cashflow Fast Booking Save:', payload);

    if (onMockSave) {
      onMockSave(payload);
    }

    onClose();
  };

  const handleFilialeClick = (filiale) => {
    if (!canSave) return;
    savePayload(buildPayload(filiale));
  };

  const handleEinnahmeSave = () => {
    if (!canSave) return;
    savePayload(buildPayload('Unternehmen'));
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 px-4 flex items-center justify-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[360px] rounded-2xl border border-white/10 bg-[#2f2d2d] shadow-[6px_6px_18px_rgba(0,0,0,0.75)] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="text-lg font-bold text-white">Neue Buchung</div>

          <div className="text-sm text-white/60 mt-1">
            KW {context.kw} · {context.tag} · {context.kategorieName}
          </div>
        </div>

        <div className="p-5">
          <label className="block text-sm text-white/70 mb-2">
            Betrag oder Feiertag
          </label>

          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="z. B. 50000 oder Feiertag"
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-white outline-none focus:border-white/35"
          />

          {!isEinnahme && value.trim().toLowerCase() !== 'feiertag' && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-sm font-semibold text-white/80 mb-2">Skonto</div>
              <div className="flex flex-wrap gap-2">
                {[false, true].map((enabled) => (
                  <button
                    key={String(enabled)}
                    type="button"
                    onClick={() => setUseSkonto(enabled)}
                    className={`rounded-lg px-4 py-2 font-semibold ${useSkonto === enabled ? 'bg-cyan-500/30 text-cyan-100' : 'bg-white/10 text-white/70'}`}
                  >
                    {enabled ? 'Ja' : 'Nein'}
                  </button>
                ))}
                {useSkonto && [2, 3].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setSkontoRate(rate)}
                    className={`rounded-lg px-4 py-2 font-semibold ${skontoRate === rate ? 'bg-emerald-500/30 text-emerald-100' : 'bg-white/10 text-white/70'}`}
                  >
                    {rate} %
                  </button>
                ))}
              </div>
              {canSave && useSkonto && (
                <div className="mt-3 text-sm text-emerald-200">
                  Geplanter Zahlbetrag: {(Number(value.replace(',', '.')) * (1 - skontoRate / 100)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </div>
              )}
            </div>
          )}

          {isEinnahme ? (
            <>
              <div className="text-xs text-white/45 mt-2">
                Einnahmen werden automatisch als Unternehmen gespeichert.
              </div>

              <button
                type="button"
                disabled={!canSave}
                onClick={handleEinnahmeSave}
                className={`w-full mt-5 rounded-xl px-4 py-3 font-semibold transition ${
                  canSave
                    ? 'bg-orange-400/20 hover:bg-orange-400/30 text-orange-200'
                    : 'bg-white/5 text-white/25 cursor-not-allowed'
                }`}
              >
                Einnahme buchen
              </button>
            </>
          ) : (
            <>
              <div className="text-xs text-white/45 mt-2">
                Speichern erfolgt durch Auswahl der Kostenstelle.
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                {FILIALEN.map((filiale) => (
                  <button
                    key={filiale}
                    type="button"
                    disabled={!canSave}
                    onClick={() => handleFilialeClick(filiale)}
                    className={`rounded-xl px-4 py-3 font-semibold transition ${
                      canSave
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-white/5 text-white/25 cursor-not-allowed'
                    }`}
                  >
                    {filiale}
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-4 rounded-xl px-4 py-2 bg-black/20 hover:bg-black/30 text-white/70 transition"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
