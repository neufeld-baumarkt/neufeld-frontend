import { useEffect, useRef, useState } from 'react';

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
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setValue('');

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

  const handleFilialeClick = (filiale) => {
    if (!canSave) return;

    const trimmed = value.trim();
    const isFeiertag = trimmed.toLowerCase() === 'feiertag';

    const payload = {
      ...context,
      filiale,
      eintrag_typ: isFeiertag ? 'feiertag' : 'betrag',
      betrag: isFeiertag ? 0 : Number(trimmed.replace(',', '.')),
      status: 'angekuendigt',
      notiz: null,
    };

    console.log('Cashflow Fast Booking Mock Save:', payload);

    if (onMockSave) {
      onMockSave(payload);
    }

    onClose();
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

          <div className="text-xs text-white/45 mt-2">
            Speichern erfolgt durch Auswahl der Filiale.
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