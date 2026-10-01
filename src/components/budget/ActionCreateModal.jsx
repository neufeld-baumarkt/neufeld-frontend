import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { buildActionPayload, parseActionNumber } from './actionCreate.mjs';

function normalizeBranches(payload) {
  const source = Array.isArray(payload) ? payload : payload?.rows || payload?.data || [];
  return source
    .map((item) => String(typeof item === 'string' ? item : item?.name || '').trim())
    .filter(Boolean)
    .map((name) => ({ name, enabled: true, amount: '' }));
}

export default function ActionCreateModal({ open, onClose, onCreated }) {
  const [actionNumber, setActionNumber] = useState('');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const target = useMemo(() => parseActionNumber(actionNumber), [actionNumber]);

  useEffect(() => {
    if (!open) return;
    setActionNumber('');
    setBranches([]);

    const token = sessionStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL;
    if (!token || !baseUrl) {
      toast.error('Filialen konnten nicht geladen werden.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    axios
      .get(`${baseUrl}/api/filialen`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!cancelled) setBranches(normalizeBranches(response.data));
      })
      .catch((error) => {
        console.error('Filialen konnten nicht geladen werden:', error);
        if (!cancelled) toast.error('Filialen konnten nicht geladen werden.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const updateBranch = (name, patch) => {
    setBranches((current) =>
      current.map((branch) => (branch.name === name ? { ...branch, ...patch } : branch))
    );
  };

  const submit = async () => {
    const built = buildActionPayload(actionNumber, branches);
    if (!built.ok) {
      toast.error(built.message);
      return;
    }

    const token = sessionStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL;
    if (!token || !baseUrl) {
      toast.error('Nicht authentifiziert.');
      return;
    }

    setSubmitting(true);
    try {
      let response;
      try {
        response = await axios.post(`${baseUrl}/api/budget/bookings/actions`, built.payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        const conflict = error?.response?.data;
        if (error?.response?.status !== 409 || conflict?.code !== 'ACTION_ALREADY_EXISTS') {
          throw error;
        }

        const affected = (conflict.existing_actions || [])
          .map((item) => `${item.filiale} (${Number(item.betrag).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)`)
          .join('\n');
        const confirmed = window.confirm(
          `Die Aktion ${built.payload.aktion_nr} gibt es bereits in:\n\n${affected}\n\n` +
            'Sollen die neuen Beträge in diesen Filialen mit den vorhandenen Buchungen zusammengeführt werden?'
        );
        if (!confirmed) return;

        response = await axios.post(
          `${baseUrl}/api/budget/bookings/actions`,
          { ...built.payload, merge_existing_action: true },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      const mergedCount = (response.data?.bookings || []).filter((booking) => booking.merged).length;
      toast.success(
        mergedCount > 0
          ? `Aktion angelegt; ${mergedCount} vorhandene Buchung(en) zusammengeführt.`
          : 'Aktion für alle ausgewählten Filialen angelegt.'
      );
      await onCreated?.();
      onClose?.();
    } catch (error) {
      console.error('Aktion konnte nicht angelegt werden:', error);
      toast.error(error?.response?.data?.message || 'Aktion konnte nicht angelegt werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 px-4 py-8 flex items-center justify-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose?.();
      }}
    >
      <div className="w-full max-w-2xl max-h-full bg-[#2f2d2d] rounded-2xl border border-white/10 shadow-[6px_6px_18px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-bold">Aktionen anlegen</div>
            <div className="text-white/60 text-sm mt-1">Eine Aktion gleichzeitig für alle berücksichtigten Filialen buchen.</div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50">
            Schließen
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <label className="flex flex-col gap-2">
            <span className="text-white/80 font-semibold">Aktionsnummer (Pflicht)</span>
            <input
              value={actionNumber}
              onChange={(event) => setActionNumber(event.target.value.toUpperCase())}
              maxLength={6}
              placeholder="z. B. A02645"
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>

          {actionNumber && (
            <div className={`mt-2 text-sm ${target.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
              {target.ok ? `Wird in Jahr ${target.jahr}, KW ${target.kw} gebucht.` : target.message}
            </div>
          )}

          <div className="mt-6">
            <div className="font-semibold">Filialbeträge</div>
            <div className="text-white/60 text-sm mt-1">Alle aktiven Filialen sind vorausgewählt. Nicht teilnehmende Filialen bitte bewusst abwählen.</div>
          </div>

          {loading ? (
            <div className="mt-4 text-white/60">Filialen werden geladen…</div>
          ) : branches.length === 0 ? (
            <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-400/30 p-3 text-rose-200">Keine aktiven Filialen verfügbar.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {branches.map((branch) => (
                <div key={branch.name} className="grid grid-cols-[minmax(0,1fr)_minmax(150px,220px)] gap-4 items-center rounded-xl bg-white/5 border border-white/10 p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={branch.enabled}
                      onChange={(event) => updateBranch(branch.name, { enabled: event.target.checked })}
                      className="h-5 w-5 accent-[#800000]"
                    />
                    <span className={branch.enabled ? 'font-semibold' : 'text-white/50 line-through'}>{branch.name}</span>
                  </label>
                  <div className="relative">
                    <input
                      value={branch.amount}
                      onChange={(event) => updateBranch(branch.name, { amount: event.target.value })}
                      disabled={!branch.enabled}
                      inputMode="decimal"
                      placeholder="0,00"
                      aria-label={`Betrag für ${branch.name}`}
                      className="w-full px-3 py-2 pr-9 rounded-lg bg-white/10 text-white text-right outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-35"
                    />
                    <span className="absolute right-3 top-2 text-white/60">€</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/10 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50">Abbrechen</button>
          <button type="button" onClick={submit} disabled={loading || submitting || branches.length === 0} className="px-4 py-2 rounded-lg bg-[#800000] hover:bg-[#6c0000] font-semibold disabled:opacity-50">
            {submitting ? 'Speichere…' : 'Aktion anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}
