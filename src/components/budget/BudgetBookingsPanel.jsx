// src/components/budget/BudgetBookingsPanel.jsx
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import BookingModal from './BookingModal';

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function formatCurrencyAsNegative(value) {
  const n = toNumber(value);
  if (n === null) return '—';
  const abs = Math.abs(n);
  const text = abs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  return `-${text}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('de-DE');
}

function normalizeRole(role) {
  return (role || '').trim();
}

function canWriteTyp({ isFilialeUser, role, typ }) {
  const r = normalizeRole(role);

  if (typ === 'sonderbestellung') return true;

  if (isFilialeUser) return typ === 'bestellung';
  if (r === 'Admin' || r === 'Supervisor') return true;
  if (r === 'Manager-1' || r === 'Geschäftsführer') return typ === 'bestellung' || typ === 'aktionsvorab';

  return false;
}

function allowedCreateTypes({ isFilialeUser, role }) {
  const r = normalizeRole(role);

  if (isFilialeUser) return ['bestellung', 'sonderbestellung'];
  if (r === 'Admin' || r === 'Supervisor') {
    return ['bestellung', 'sonderbestellung', 'aktionsvorab', 'abgabe', 'korrektur'];
  }
  if (r === 'Manager-1' || r === 'Geschäftsführer') {
    return ['bestellung', 'sonderbestellung', 'aktionsvorab'];
  }

  return ['sonderbestellung'];
}

function titleForTyp(typ) {
  switch (typ) {
    case 'bestellung':
      return 'Bestellung';
    case 'sonderbestellung':
      return 'Sonderbestellung';
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

function badgeClasses(typ) {
  switch (typ) {
    case 'bestellung':
      return 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30';
    case 'sonderbestellung':
      return 'bg-amber-500/20 text-amber-200 border border-amber-500/30';
    case 'aktionsvorab':
      return 'bg-sky-500/20 text-sky-200 border border-sky-500/30';
    case 'abgabe':
      return 'bg-orange-500/20 text-orange-200 border border-orange-500/30';
    case 'korrektur':
      return 'bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/30';
    default:
      return 'bg-white/10 text-white/80 border border-white/10';
  }
}

function displayText(v) {
  const t = String(v ?? '').trim();
  return t.length > 0 ? t : '—';
}

function displayAktionNr(b) {
  if (String(b?.typ || '').trim() !== 'aktionsvorab') return '—';
  const a = String(b?.aktion_nr ?? '').trim();
  return a.length > 0 ? a : '—';
}

export default function BudgetBookingsPanel({
  jahr,
  kw,
  effectiveFiliale,
  isSuperUser,
  isFilialeUser,
  userRole,
  bookings,
  weekSummary,
  loading,
  onReload,
  onCreate,
  onUpdate,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editBooking, setEditBooking] = useState(null);

  const createTypes = useMemo(
    () => allowedCreateTypes({ isFilialeUser, role: userRole }),
    [isFilialeUser, userRole],
  );

  const canCreateAnything = createTypes.length > 0;

  const totalVerbraucht = useMemo(() => {
    return weekSummary?.verbraucht ?? null;
  }, [weekSummary]);

  const openCreate = () => {
    if (!canCreateAnything) {
      toast.error('Keine Berechtigung zum Anlegen.');
      return;
    }
    setEditBooking(null);
    setModalOpen(true);
  };

  const openEdit = (b) => {
    if (!b) return;
    setEditBooking(b);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    if (payload === undefined) {
      await onReload?.();
      return true;
    }

    if (editBooking) {
      const ok = await onUpdate?.(editBooking.id, payload, editBooking);
      if (ok) {
        setModalOpen(false);
        setEditBooking(null);
      }
      return ok;
    }

    const ok = await onCreate?.(payload);
    if (ok) {
      setModalOpen(false);
      setEditBooking(null);
    }
    return ok;
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 shadow-[6px_6px_18px_rgba(0,0,0,0.55)]">
      <div className="p-6 flex items-center justify-between gap-4 border-b border-white/10">
        <div>
          <div className="text-xl font-bold">Buchungen</div>
          <div className="text-white/60 text-sm mt-1">
            KW {kw} · {jahr} · {effectiveFiliale}
            {totalVerbraucht !== null ? ` · Verbraucht: ${formatCurrencyAsNegative(totalVerbraucht)}` : ''}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReload}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
            disabled={loading}
          >
            Reload
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition font-semibold disabled:opacity-40"
            disabled={loading || !canCreateAnything}
          >
            + Buchung
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-white/60">Lädt…</div>
        ) : !Array.isArray(bookings) || bookings.length === 0 ? (
          <div className="text-white/60">Keine Buchungen.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60 border-b border-white/10">
                  <th className="text-left py-2 pr-3 font-medium">Datum</th>
                  <th className="text-left py-2 pr-3 font-medium">Typ</th>
                  <th className="text-left py-2 pr-3 font-medium">Lieferant</th>
                  <th className="text-left py-2 pr-3 font-medium">Aktionsnummer</th>
                  <th className="text-left py-2 pr-3 font-medium">Beschreibung</th>
                  <th className="text-right py-2 pl-3 font-medium">Betrag</th>
                  <th className="text-right py-2 pl-3 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const typ = b?.typ || '';
                  const editable = canWriteTyp({ isFilialeUser, role: userRole, typ });

                  return (
                    <tr key={b.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDate(b?.datum)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md ${badgeClasses(typ)}`}>
                          {titleForTyp(typ)}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{displayText(b?.lieferant)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{displayAktionNr(b)}</td>
                      <td className="py-2 pr-3">{displayText(b?.beschreibung)}</td>
                      <td className="py-2 pl-3 text-right whitespace-nowrap">
                        {formatCurrencyAsNegative(b?.betrag)}
                      </td>
                      <td className="py-2 pl-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition"
                            onClick={() => openEdit(b)}
                            disabled={!editable}
                            title={!editable ? 'Keine Berechtigung' : 'Bearbeiten / Löschen'}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BookingModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditBooking(null);
        }}
        mode={editBooking ? 'edit' : 'create'}
        initialBooking={editBooking}
        jahr={jahr}
        kw={kw}
        sourceFiliale={effectiveFiliale}
        effectiveFiliale={effectiveFiliale}
        allowedTypes={createTypes}
        onSubmit={handleSubmit}
        onDeleted={onReload}
      />
    </div>
  );
}