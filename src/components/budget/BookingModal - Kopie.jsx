// src/components/budget/BookingModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function toInputDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function todayInputDate() {
  return toInputDate(new Date());
}

function parseAmount(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  // "600,00" / "600.00" / "600" / "1.234,56"
  const cleaned = raw
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

// Robust gegen payload.rows + verschiedene Feldnamen
function normalizeLieferantenResponse(payload) {
  if (!payload) return [];
  const arr = Array.isArray(payload)
    ? payload
    : (payload.rows || payload.lieferanten || payload.items || payload.data || []);

  if (!Array.isArray(arr)) return [];

  const values = arr
    .map((x) => {
      if (!x) return null;
      if (typeof x === 'string') return x.trim();
      if (typeof x === 'object') {
        return String(
          x.bezeichnung ??
            x.name ??
            x.value ??
            x.lieferant ??
            x.lieferanten_name ??
            x.lieferantenname ??
            ''
        ).trim();
      }
      return null;
    })
    .filter((x) => x && x.length > 0);

  // uniq
  const seen = new Set();
  const out = [];
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function typeLabel(typ) {
  if (typ === 'bestellung') return 'Bestellung';
  if (typ === 'aktionsvorab') return 'Aktion';
  return typ || '—';
}

const DEFAULT_FILIALEN = ['Ahaus', 'Münster', 'Telgte', 'Vreden'];

export default function BookingModal({
  open,
  onClose,
  mode, // 'create' | 'edit'
  initialBooking,
  allowedTypes, // kommt vom Panel, kann später Aktion je nach Rolle rausfiltern
  sourceFiliale, // aktuelle Filiale (z. B. Münster)
  onSubmit,

  // optional: wenn du später Split wirklich senden willst
  enableSplitSubmit = false,

  // optional: wenn du Filialen dynamisch liefern willst
  filialen = DEFAULT_FILIALEN,
}) {
  const isEdit = mode === 'edit';

  // Typ: im Cut nur Bestellung/Aktion
  const typeOptions = useMemo(() => {
    const base = Array.isArray(allowedTypes) && allowedTypes.length > 0
      ? allowedTypes
      : ['bestellung', 'aktionsvorab'];

    // Cut: nur diese beiden
    return base.filter((t) => t === 'bestellung' || t === 'aktionsvorab');
  }, [allowedTypes]);

  const [typ, setTyp] = useState('bestellung');

  // Bestellung Basisfelder
  const [betrag, setBetrag] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [datum, setDatum] = useState('');
  const [lieferant, setLieferant] = useState('');

  // Lieferanten
  const [lieferantenOptions, setLieferantenOptions] = useState([]);
  const [lieferantenLoading, setLieferantenLoading] = useState(false);

  // Split UI
  const [splitOn, setSplitOn] = useState(false);
  const [splitTargets, setSplitTargets] = useState(() => {
    const obj = {};
    for (const f of DEFAULT_FILIALEN) obj[f] = { enabled: false, amount: '' };
    return obj;
  });

  // Filialen, ohne Quelle
  const selectableFilialen = useMemo(() => {
    const src = String(sourceFiliale || '').trim();
    return (Array.isArray(filialen) ? filialen : DEFAULT_FILIALEN)
      .filter((f) => f && String(f).trim().length > 0)
      .filter((f) => !src || f !== src);
  }, [filialen, sourceFiliale]);

  const loadLieferanten = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_URL;
    if (!baseUrl) return;

    // VERIFIZIERT aus deiner bisherigen produktiven Datei: /api/lieferanten
    const url = `${baseUrl}/api/lieferanten`;

    try {
      setLieferantenLoading(true);
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLieferantenOptions(normalizeLieferantenResponse(res.data));
    } catch (err) {
      console.error('Lieferanten konnten nicht geladen werden:', err);
      toast.error('Lieferanten konnten nicht geladen werden.');
      setLieferantenOptions([]);
    } finally {
      setLieferantenLoading(false);
    }
  };

  // Reset / Prefill beim Öffnen
  useEffect(() => {
    if (!open) return;

    loadLieferanten();

    // Typ
    if (isEdit && initialBooking?.typ) {
      setTyp(initialBooking.typ);
    } else {
      setTyp(typeOptions[0] || 'bestellung');
    }

    // Betrag
    if (isEdit) {
      setBetrag(initialBooking?.betrag ?? '');
    } else {
      setBetrag('');
    }

    // Beschreibung
    setBeschreibung(isEdit ? (initialBooking?.beschreibung ?? '') : '');

    // Datum: Pflicht, Default = heute
    if (isEdit) {
      setDatum(toInputDate(initialBooking?.datum || initialBooking?.created_at) || todayInputDate());
    } else {
      setDatum(todayInputDate());
    }

    // Lieferant: Pflicht
    setLieferant(isEdit ? (initialBooking?.lieferant ?? '') : '');

    // Split: Cut => immer AUS beim Öffnen
    setSplitOn(false);

    // Split Targets zurücksetzen
    setSplitTargets(() => {
      const obj = {};
      const all = Array.isArray(filialen) && filialen.length > 0 ? filialen : DEFAULT_FILIALEN;
      for (const f of all) obj[f] = { enabled: false, amount: '' };
      return obj;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ESC schließt
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Split Summen live
  const splitCalc = useMemo(() => {
    const total = parseAmount(betrag);
    let sum = 0;

    const enabled = [];
    for (const f of selectableFilialen) {
      const entry = splitTargets?.[f];
      if (!entry?.enabled) continue;

      const n = parseAmount(entry.amount);
      enabled.push({ filiale: f, amount: n });
      if (n !== null && n > 0) sum += n;
    }

    const rest = total === null ? null : (total - sum);
    return { total, sum, rest, enabled };
  }, [betrag, splitTargets, selectableFilialen]);

  function validateSimple() {
    // Typ nur Bestellung/Aktion
    if (typ !== 'bestellung' && typ !== 'aktionsvorab') return 'Typ ist ungültig.';

    const b = parseAmount(betrag);
    if (b === null || b <= 0) return 'Betrag ist Pflicht und muss > 0 sein.';

    const d = String(datum || '').trim();
    if (!d) return 'Datum ist Pflicht.';

    const l = String(lieferant || '').trim();
    if (!l) return 'Lieferant ist Pflicht.';

    // Beschreibung optional => ok
    return null;
  }

  function validateSplit() {
    const baseError = validateSimple();
    if (baseError) return baseError;

    // mindestens 1 Ziel aktiv
    if (splitCalc.enabled.length === 0) return 'Für Split musst du mindestens eine Filiale aktivieren.';

    // alle aktivierten brauchen Betrag > 0
    for (const x of splitCalc.enabled) {
      if (x.amount === null || x.amount <= 0) return `Betrag für ${x.filiale} ist Pflicht und muss > 0 sein.`;
    }

    // Summe darf Gesamtbetrag nicht überschreiten
    if (splitCalc.total !== null && splitCalc.rest !== null && splitCalc.rest < 0) {
      return 'Summe der Split-Beträge darf den Gesamtbetrag nicht überschreiten.';
    }

    return null;
  }

  async function handleSubmit() {
    if (!onSubmit) return;

    if (!splitOn) {
      const err = validateSimple();
      if (err) return toast.error(err);

      const payload = {
        typ,
        betrag: parseAmount(betrag),
        datum,
        lieferant: String(lieferant).trim(),
      };

      const desc = String(beschreibung || '').trim();
      if (desc) payload.beschreibung = desc;

      await onSubmit(payload);
      return;
    }

    // Split ON
    const err = validateSplit();
    if (err) return toast.error(err);

    if (!enableSplitSubmit) {
      // Cut: UI fertig, Backend-Wiring später
      toast.error('Split/Mitbestellung ist im Backend noch nicht angebunden (Cut).');
      return;
    }

    // Falls später aktiviert:
    const splits = splitCalc.enabled.map((x) => ({
      target_filiale: x.filiale,
      betrag: x.amount,
    }));

    const payload = {
      typ,
      gesamtbetrag: splitCalc.total,
      datum,
      lieferant: String(lieferant).trim(),
      splits,
    };

    const desc = String(beschreibung || '').trim();
    if (desc) payload.beschreibung = desc;

    await onSubmit(payload);
  }

  if (!open) return null;

  const splitOffStyle = splitOn ? 'bg-white/10' : 'bg-[#800000]/40 border-[#800000]/40';
  const splitOnStyle = splitOn ? 'bg-[#2a5a2a]/40 border-[#2a5a2a]/40' : 'bg-white/10';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-3xl bg-[#2f2d2d] rounded-2xl shadow-[6px_6px_18px_rgba(0,0,0,0.7)] border border-white/10">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-6">
          <div>
            <div className="text-2xl font-bold">{isEdit ? 'Buchung bearbeiten' : 'Neue Buchung'}</div>
            <div className="text-white/60 mt-1 text-sm">
              Typ: {typeLabel(typ)}
              {sourceFiliale ? ` · Quelle: ${sourceFiliale}` : ''}
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            Schließen
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Row 1: Typ + Betrag */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-white/80 font-semibold">Typ</span>
              <select
                value={typ}
                onChange={(e) => setTyp(e.target.value)}
                disabled={isEdit}
                className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-60"
              >
                {typeOptions.map((t) => (
                  <option key={t} value={t} className="text-black">
                    {typeLabel(t)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-white/80 font-semibold">Betrag (Pflicht)</span>
              <input
                value={betrag}
                onChange={(e) => setBetrag(e.target.value)}
                placeholder="z. B. 600,00"
                className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
              />
            </label>
          </div>

          {/* Beschreibung */}
          <label className="flex flex-col gap-2">
            <span className="text-white/80 font-semibold">Beschreibung</span>
            <input
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="optional"
              className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>

          {/* Row 2: Datum + Lieferant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-white/80 font-semibold">Datum (Pflicht)</span>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-white/80 font-semibold">Lieferant (Pflicht)</span>
              <select
                value={lieferant}
                onChange={(e) => setLieferant(e.target.value)}
                className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="" className="text-black">
                  {lieferantenLoading ? 'lädt…' : 'Bitte wählen…'}
                </option>
                {lieferantenOptions.map((l) => (
                  <option key={l} value={l} className="text-black">
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Split Switch + Accordion */}
          {!isEdit && typ === 'bestellung' && (
            <div className="space-y-3">
              <div className={`border rounded-xl p-4 ${splitOn ? splitOnStyle : splitOffStyle}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold">Gesplittete Bestellung</div>
                    <div className="text-white/70 text-sm">
                      Standard: AUS. Wenn AN, verteilst du Teilbeträge auf andere Filialen.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSplitOn((v) => !v)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      splitOn ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {splitOn ? 'AN' : 'AUS'}
                  </button>
                </div>
              </div>

              {splitOn && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="font-semibold mb-2">Filialen auswählen</div>
                  <div className="text-white/60 text-sm mb-4">
                    Aktivierte Filialen bekommen Pflicht-Felder. Restbetrag bleibt bei {sourceFiliale || 'Quelle'}.
                  </div>

                  <div className="space-y-3">
                    {selectableFilialen.map((f) => {
                      const entry = splitTargets?.[f] || { enabled: false, amount: '' };
                      return (
                        <div key={f} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                          <div className="md:col-span-4 flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={!!entry.enabled}
                              onChange={(e) => {
                                const enabled = e.target.checked;
                                setSplitTargets((prev) => ({
                                  ...prev,
                                  [f]: { enabled, amount: enabled ? (prev?.[f]?.amount ?? '') : '' },
                                }));
                              }}
                            />
                            <div className="font-semibold">{f}</div>
                          </div>

                          <label className="md:col-span-8 flex flex-col gap-1">
                            <span className="text-white/60 text-xs">
                              Betrag {f}{entry.enabled ? ' (Pflicht)' : ''}
                            </span>
                            <input
                              value={entry.amount}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSplitTargets((prev) => ({
                                  ...prev,
                                  [f]: { enabled: true, amount: v },
                                }));
                              }}
                              disabled={!entry.enabled}
                              placeholder="z. B. 150,00"
                              className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-40"
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-white/60">Summe Splits</div>
                      <div className="font-semibold">
                        {Number.isFinite(splitCalc.sum) ? splitCalc.sum.toFixed(2) : '—'}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-white/60">Eigenanteil ({sourceFiliale || 'Quelle'})</div>
                      <div className="font-semibold">
                        {splitCalc.rest === null || !Number.isFinite(splitCalc.rest) ? '—' : splitCalc.rest.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-white/60">Gesamtbetrag</div>
                      <div className="font-semibold">
                        {splitCalc.total === null || !Number.isFinite(splitCalc.total) ? '—' : splitCalc.total.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="text-white/50 text-xs mt-3">
                    Regel: Summe Split-Beträge darf den Gesamtbetrag nicht überschreiten.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg bg-[#800000] hover:bg-[#6d0000] transition font-semibold"
          >
            {isEdit ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}
