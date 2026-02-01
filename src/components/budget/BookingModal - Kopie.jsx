// src/components/budget/BookingModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function normalizeRole(role) {
  return (role || '').trim();
}

function titleForTyp(typ) {
  switch (typ) {
    case 'bestellung':
      return 'Bestellung';
    case 'aktionsvorab':
      return 'Aktion';
    case 'abgabe':
      return 'Abgabe';
    case 'korrektur':
      return 'Korrektur';
    default:
      return typ || '—';
  }
}

function toInputDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseAmount(value) {
  const s = String(value ?? '').trim().replace(',', '.');
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

function buildTypeOptions(allowedTypes, isEdit, existingTyp) {
  if (isEdit) return existingTyp ? [existingTyp] : [];
  return allowedTypes || [];
}

// ✅ EINZIGE ÄNDERUNG: Robust gegen payload.rows + mehr Feldnamen
function normalizeLieferantenResponse(payload) {
  if (!payload) return [];

  const arr = Array.isArray(payload)
    ? payload
    : (payload.lieferanten || payload.items || payload.rows || payload.data || []);

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

  const seen = new Set();
  const out = [];
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function shouldRequireLieferant(typ) {
  return typ === 'bestellung' || typ === 'aktionsvorab';
}

export default function BookingModal({
  open,
  onClose,
  mode, // 'create' | 'edit'
  initialBooking,
  allowedTypes,
  isFilialeUser,
  userRole,
  onSubmit,
}) {
  const isEdit = mode === 'edit';

  const typeOptions = useMemo(
    () => buildTypeOptions(allowedTypes, isEdit, initialBooking?.typ),
    [allowedTypes, isEdit, initialBooking],
  );

  const [typ, setTyp] = useState(typeOptions[0] || 'bestellung');
  const [betrag, setBetrag] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [datum, setDatum] = useState('');
  const [lieferant, setLieferant] = useState('');
  const [aktionNr, setAktionNr] = useState('');
  const [vonFiliale, setVonFiliale] = useState('');
  const [anFiliale, setAnFiliale] = useState('');

  const [lieferantenOptions, setLieferantenOptions] = useState([]);
  const [lieferantenLoading, setLieferantenLoading] = useState(false);

  const loadLieferanten = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_URL;
    if (!baseUrl) return;

    // ✅ VERIFIZIERT: Backend mountet stammdatenRoutes unter /api (nicht /api/stammdaten)
    // routes/stammdaten.js: router.get('/lieferanten' ...)
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

  useEffect(() => {
    if (!open) return;

    loadLieferanten();

    if (isEdit && initialBooking) {
      setTyp(initialBooking.typ || 'bestellung');
      setBetrag(initialBooking.betrag ?? '');
      setBeschreibung(initialBooking.beschreibung ?? '');
      setDatum(toInputDate(initialBooking.datum || initialBooking.created_at));
      setLieferant(initialBooking.lieferant ?? '');
      setAktionNr(initialBooking.aktion_nr ?? '');
      setVonFiliale(initialBooking.von_filiale ?? '');
      setAnFiliale(initialBooking.an_filiale ?? '');
      return;
    }

    setTyp(typeOptions[0] || 'bestellung');
    setBetrag('');
    setBeschreibung('');
    setDatum('');
    setLieferant('');
    setAktionNr('');
    setVonFiliale('');
    setAnFiliale('');
  }, [open, isEdit, initialBooking, typeOptions]);

  if (!open) return null;

  const roleLabel = normalizeRole(userRole);
  const modalTitle = isEdit ? 'Buchung bearbeiten' : 'Neue Buchung';

  const validate = () => {
    const a = parseAmount(betrag);
    if (a === null) return 'Betrag ist ungültig.';
    if (a === 0) return 'Betrag darf nicht 0 sein.';
    if (shouldRequireLieferant(typ) && (!lieferant || String(lieferant).trim() === '')) {
      return 'Lieferant ist Pflicht.';
    }
    if (!typ) return 'Typ fehlt.';
    return null;
  };

  const submit = async () => {
    const error = validate();
    if (error) {
      window.alert(error);
      return;
    }

    const payload = {
      typ,
      // UI zeigt immer negativ – fachlich senden wir als POSITIV (Ausgabe)
      // und normalisieren User-Eingaben (z. B. -600 -> 600)
      betrag: Math.abs(parseAmount(betrag)),
    };

    if (datum) payload.datum = datum;
    if (lieferant) payload.lieferant = lieferant;
    if (aktionNr) payload.aktion_nr = aktionNr;
    if (vonFiliale) payload.von_filiale = vonFiliale;
    if (anFiliale) payload.an_filiale = anFiliale;

    const desc = String(beschreibung ?? '').trim();
    if (desc) payload.beschreibung = desc;

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-2xl bg-[#2f2d2d] rounded-2xl shadow-[6px_6px_18px_rgba(0,0,0,0.7)] border border-white/10">
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-6">
          <div>
            <div className="text-2xl font-bold">{modalTitle}</div>
            <div className="text-white/70 mt-1">
              Rolle: {roleLabel || '—'}{isFilialeUser ? ' · Filiale' : ' · Zentrale'}
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            Schließen
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {titleForTyp(t)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-white/80 font-semibold">Betrag</span>
            <input
              value={betrag}
              onChange={(e) => setBetrag(e.target.value)}
              placeholder="z. B. 600.00"
              className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-white/80 font-semibold">Beschreibung</span>
            <input
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="optional"
              className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-white/80 font-semibold">Datum (optional)</span>
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-white/80 font-semibold">
              Lieferant{shouldRequireLieferant(typ) ? '' : ' (optional)'}
            </span>
            <select
              value={lieferant}
              onChange={(e) => setLieferant(e.target.value)}
              className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
            >
              <option value="" className="text-black">
                {lieferantenLoading ? 'Lade…' : 'Bitte wählen…'}
              </option>

              {/* falls Edit-Wert nicht in Stammdaten ist, trotzdem anzeigen */}
              {lieferant && !lieferantenOptions.includes(lieferant) ? (
                <option value={lieferant} className="text-black">{lieferant}</option>
              ) : null}

              {lieferantenOptions.map((l) => (
                <option key={l} value={l} className="text-black">{l}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-white/80 font-semibold">Aktion-Nr (optional)</span>
            <input
              value={aktionNr}
              onChange={(e) => setAktionNr(e.target.value)}
              placeholder="z. B. A02601"
              className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-white/80 font-semibold">Von Filiale (optional)</span>
            <input
              value={vonFiliale}
              onChange={(e) => setVonFiliale(e.target.value)}
              placeholder="z. B. Münster"
              className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-white/80 font-semibold">An Filiale (optional)</span>
            <input
              value={anFiliale}
              onChange={(e) => setAnFiliale(e.target.value)}
              placeholder="z. B. Vreden"
              className="bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>
        </div>

        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            Abbrechen
          </button>

          <button
            onClick={submit}
            className="px-4 py-2 rounded-lg bg-[#800000] hover:bg-[#6c0000] transition"
          >
            {isEdit ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}
