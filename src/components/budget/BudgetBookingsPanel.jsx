// src/components/budget/BudgetBookingsPanel.jsx
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import BookingModal from './BookingModal';

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function formatCurrency(value) {
  const n = toNumber(value);
  if (n === null) return '—';
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// Anzeige immer als NEGATIV – egal wie gespeichert/angelegt.
// Backend bleibt Wahrheit (Summen/Views etc. nicht anfassen).
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
  // Backend ist Wahrheit – UI blendet nur passend ein.
  const r = normalizeRole(role);

  // Filiale darf nur Bestellung
  if (isFilialeUser) return typ === 'bestellung';

  // Admin/Supervisor darf alles
  if (r === 'Admin' || r === 'Supervisor') return true;

  // Manager/GF: nur Bestellung/Aktion
  if (r === 'Manager-1' || r === 'Geschäftsführer') return typ === 'bestellung' || typ === 'aktionsvorab';

  return false;
}

function allowedCreateTypes({ isFilialeUser, role }) {
  const r = normalizeRole(role);

  if (isFilialeUser) return ['bestellung'];

  if (r === 'Admin' || r === 'Supervisor') return ['bestellung', 'aktionsvorab', 'abgabe', 'korrektur'];

  if (r === 'Manager-1' || r === 'Geschäftsführer') return ['bestellung', 'aktionsvorab'];

  return [];
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

function badgeClasses(typ) {
  switch (typ) {
    case 'bestellung':
      return 'bg-white/10';
    case 'aktionsvorab':
      return 'bg-white/10';
    case 'abgabe':
      return 'bg-white/10';
    case 'korrektur':
      return 'bg-white/10';
    default:
      return 'bg-white/10';
  }
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
  onDelete,
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

  const confirmDelete = (b) => {
    if (!b) return;

    const ok = window.confirm('Buchung wirklich löschen?');
    if (!ok) return;

    // Wichtig: komplettes Booking-Objekt übergeben (Split-Entscheidung im Parent)
    onDelete?.(b);
  };

  const handleSubmit = async (payload) => {
    // ✅ Für Split-POST: Modal kann nach Erfolg "nur reload" triggern (payload undefined)
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
                      <td className="py-2 pr-3">{b?.lieferant || '—'}</td>
                      <td className="py-2 pr-3">{b?.beschreibung || '—'}</td>
                      <td className="py-2 pl-3 text-right whitespace-nowrap">
                        {formatCurrencyAsNegative(b?.betrag)}
                      </td>
                      <td className="py-2 pl-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition"
                            onClick={() => openEdit(b)}
                            disabled={!editable}
                            title={!editable ? 'Keine Berechtigung' : 'Bearbeiten'}
                          >
                            Edit
                          </button>
                          <button
                            className="px-3 py-1 rounded-md bg-[#800000]/40 hover:bg-[#800000]/55 border border-[#800000]/40 transition"
                            onClick={() => confirmDelete(b)}
                            disabled={!editable}
                            title={!editable ? 'Keine Berechtigung' : 'Löschen'}
                          >
                            Delete
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
        editBooking={editBooking}
        jahr={jahr}
        kw={kw}
        effectiveFiliale={effectiveFiliale}
        isSuperUser={isSuperUser}
        isFilialeUser={isFilialeUser}
        userRole={userRole}
        allowedTypes={createTypes}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
