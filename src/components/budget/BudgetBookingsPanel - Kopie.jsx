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
      return 'bg-white/15';
    case 'aktionsvorab':
      return 'bg-[#800000]/60';
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
    // FIX: nur die UUID übergeben, nicht das Objekt
    onDelete?.(b.id);
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
          <div className="text-white/60">Keine Buchungen gefunden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60">
                  <th className="py-2 pr-4 whitespace-nowrap">Datum</th>
                  <th className="py-2 pr-4 whitespace-nowrap">Typ</th>
                  <th className="py-2 pr-4">Beschreibung</th>
                  <th className="py-2 pr-4 whitespace-nowrap text-right">Betrag</th>
                  <th className="py-2 pr-0 whitespace-nowrap text-right">Aktion</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((b) => {
                  const canWrite = canWriteTyp({ isFilialeUser, role: userRole, typ: b?.typ });

                  return (
                    <tr key={b.id} className="border-t border-white/10 align-top">
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {formatDate(b?.datum || b?.created_at)}
                      </td>

                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClasses(b?.typ)}`}>
                          {titleForTyp(b?.typ)}
                        </span>
                      </td>

                      <td className="py-3 pr-4">
                        <div className="font-semibold">{b?.beschreibung || '—'}</div>
                        <div className="text-white/50 text-xs mt-1">
                          {b?.lieferant ? `Lieferant: ${b.lieferant}` : ''}
                        </div>
                      </td>

                      <td className="py-3 pr-4 whitespace-nowrap text-right font-semibold">
                        <span className="text-red-400">{formatCurrencyAsNegative(b?.betrag)}</span>
                      </td>

                      <td className="py-3 pr-0 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEdit(b)}
                            disabled={!canWrite}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-40"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => confirmDelete(b)}
                            disabled={!canWrite}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-40"
                          >
                            Löschen
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
        onClose={() => { setModalOpen(false); setEditBooking(null); }}
        mode={editBooking ? 'edit' : 'create'}
        initialBooking={editBooking}
        allowedTypes={createTypes}
        isFilialeUser={isFilialeUser}
        userRole={userRole}
        sourceFiliale={effectiveFiliale}
        // ✅ Schritt C: Kontext ins Modal (Transport, keine Logik)
        jahr={jahr}
        kw={kw}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
