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
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  // Verifiziertes Rollenformat: "Filiale" | "Supervisor" | "Admin" | "Manager-1" | "Geschäftsführer" (u. a.)
  const r = normalizeRole(role);

  if (isFilialeUser) {
    return typ === 'bestellung';
  }

  // Zentralrollen:
  if (r === 'Admin' || r === 'Supervisor') {
    return true; // dürfen alle Typen schreiben
  }

  // Manager-1 / Geschäftsführer dürfen aktionsvorab, aber nicht abgabe/korrektur (laut SSoT)
  if (r === 'Manager-1' || r === 'Geschäftsführer') {
    return typ === 'aktionsvorab' || typ === 'bestellung';
  }

  // Fallback: konservativ
  return false;
}

function allowedCreateTypes({ isFilialeUser, role }) {
  const r = normalizeRole(role);

  if (isFilialeUser) return ['bestellung'];

  if (r === 'Admin' || r === 'Supervisor') {
    return ['bestellung', 'aktionsvorab', 'abgabe', 'korrektur'];
  }

  if (r === 'Manager-1' || r === 'Geschäftsführer') {
    return ['bestellung', 'aktionsvorab'];
  }

  return [];
}

function titleForTyp(typ) {
  switch (typ) {
    case 'bestellung':
      return 'Bestellung';
    case 'aktionsvorab':
      return 'Aktionsvorab';
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

function buildMetaLine(b) {
  const parts = [];
  if (b.lieferant) parts.push(`Lieferant: ${b.lieferant}`);
  if (b.aktion_nr) parts.push(`Aktion: ${b.aktion_nr}`);
  if (b.von_filiale || b.an_filiale) {
    const from = b.von_filiale || '—';
    const to = b.an_filiale || '—';
    parts.push(`${from} → ${to}`);
  }
  return parts.join(' · ');
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
    // weekSummary.verbraucht ist laut API String – wir formatieren sauber
    return weekSummary?.verbraucht ?? null;
  }, [weekSummary]);

  const openCreate = () => {
    if (!canCreateAnything) {
      toast.error('Keine Berechtigung zum Anlegen von Buchungen.');
      return;
    }
    setEditBooking(null);
    setModalOpen(true);
  };

  const openEdit = (b) => {
    if (!canWriteTyp({ isFilialeUser, role: userRole, typ: b.typ })) {
      toast.error('Keine Berechtigung zum Bearbeiten dieser Buchung.');
      return;
    }
    setEditBooking(b);
    setModalOpen(true);
  };

  const confirmDelete = async (b) => {
    if (!canWriteTyp({ isFilialeUser, role: userRole, typ: b.typ })) {
      toast.error('Keine Berechtigung zum Löschen dieser Buchung.');
      return;
    }
    const ok = window.confirm(`Buchung wirklich löschen?\n\n${titleForTyp(b.typ)} · ${b.beschreibung || ''}`);
    if (!ok) return;
    await onDelete(b.id);
  };

  const handleSubmit = async (payload) => {
    // payload ist bereits UI-validiert (BookingModal)
    if (editBooking) {
      const ok = await onUpdate(editBooking.id, payload);
      if (ok) {
        setModalOpen(false);
        setEditBooking(null);
      }
      return;
    }

    const ok = await onCreate(payload);
    if (ok) {
      setModalOpen(false);
      setEditBooking(null);
    }
  };

  const subtitleParts = [];
  if (effectiveFiliale) subtitleParts.push(effectiveFiliale);
  if (jahr) subtitleParts.push(String(jahr));
  if (kw) subtitleParts.push(`KW ${kw}`);
  if (totalVerbraucht !== null && totalVerbraucht !== undefined) {
    subtitleParts.push(`Verbraucht: ${formatCurrency(totalVerbraucht)}`);
  }

  return (
    <div className="bg-white/10 rounded-2xl p-6 shadow-[3px_3px_6px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold">Buchungen dieser Woche</div>
          <div className="text-white/70 mt-1">{subtitleParts.join(' · ')}</div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReload}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
          >
            {loading ? 'Lade…' : 'Aktualisieren'}
          </button>

          <button
            onClick={openCreate}
            disabled={!canCreateAnything}
            className="px-4 py-2 rounded-lg bg-[#800000] hover:bg-[#6c0000] transition disabled:opacity-50"
          >
            + Buchung
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-auto">
        {bookings.length === 0 ? (
          <div className="text-white/70 py-6">Keine Buchungen vorhanden.</div>
        ) : (
          <table className="min-w-[980px] w-full text-left">
            <thead className="text-white/70">
              <tr>
                <th className="py-2 pr-4 whitespace-nowrap">Datum</th>
                <th className="py-2 pr-4 whitespace-nowrap">Typ</th>
                <th className="py-2 pr-4 min-w-[240px]">Beschreibung</th>
                <th className="py-2 pr-4 min-w-[240px]">Details</th>
                <th className="py-2 pr-4 whitespace-nowrap text-right">Betrag</th>
                <th className="py-2 pr-0 whitespace-nowrap text-right">Aktion</th>
              </tr>
            </thead>

            <tbody>
              {bookings.map((b) => {
                const dateValue = b.datum || b.created_at;
                const canWrite = canWriteTyp({ isFilialeUser, role: userRole, typ: b.typ });
                const metaLine = buildMetaLine(b);

                return (
                  <tr key={b.id} className="border-t border-white/10">
                    <td className="py-3 pr-4 whitespace-nowrap">{formatDate(dateValue)}</td>

                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm ${badgeClasses(b.typ)}`}>
                        {titleForTyp(b.typ)}
                      </span>
                    </td>

                    <td className="py-3 pr-4">
                      <div className="font-semibold">{b.beschreibung || '—'}</div>
                      <div className="text-white/60 text-sm">
                        Erstellt: {formatDate(b.created_at)}
                        {b.created_by ? ` · von ${b.created_by}` : ''}
                      </div>
                    </td>

                    <td className="py-3 pr-4">
                      {metaLine ? <div className="text-white/80">{metaLine}</div> : <div className="text-white/40">—</div>}
                    </td>

                    <td className="py-3 pr-4 whitespace-nowrap text-right font-semibold">
                      {formatCurrency(b.betrag)}
                    </td>

                    <td className="py-3 pr-0 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEdit(b)}
                          disabled={!canWrite}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                        >
                          Bearbeiten
                        </button>

                        <button
                          onClick={() => confirmDelete(b)}
                          disabled={!canWrite}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
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
        onSubmit={handleSubmit}
      />
    </div>
  );
}
