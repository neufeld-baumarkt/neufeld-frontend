// src/components/budget/BudgetDataPanel.jsx
import React, { useMemo, useState } from 'react';

function normalizeToArray(payload) {
  if (!payload) return [];

  // Backend-Info-Antwort: bewusst KEINE Daten
  if (
    typeof payload === 'object' &&
    payload.message &&
    payload.message.includes('Keine Budgetdaten')
  ) {
    return [];
  }

  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'object') return [payload];
  return [];
}

export default function BudgetDataPanel({ data, loading }) {
  const [showRaw, setShowRaw] = useState(false);

  const rows = useMemo(() => normalizeToArray(data), [data]);

  const isNoDataMessage =
    data &&
    typeof data === 'object' &&
    data.message &&
    data.message.includes('Keine Budgetdaten');

  const preferredFields = [
    { label: 'Filiale', keys: ['filiale'] },
    { label: 'Jahr', keys: ['jahr'] },
    { label: 'KW', keys: ['kw'] },
    { label: 'Umsatz Vorwoche (brutto)', keys: ['umsatz_vorwoche_brutto', 'umsatz_vorwoche'] },
    { label: 'Budget freigegeben', keys: ['budget_freigegeben', 'budget'] },
    { label: 'Verbraucht', keys: ['verbraucht'] },
    { label: 'Rest', keys: ['rest'] },
    { label: 'Offene Buchungen', keys: ['offene_buchungen', 'open_bookings'] },
  ];

  const pickValue = (obj, keys) => {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
    }
    return undefined;
  };

  if (loading && !data) {
    return (
      <div className="bg-white/10 rounded-2xl p-6">
        <div className="text-2xl font-semibold">Lade Budgetdaten…</div>
        <div className="text-white/70 mt-2">Bitte einen Moment.</div>
      </div>
    );
  }

  // 👇 Sauberer Empty-State bei nicht angelegter Woche
  if (isNoDataMessage) {
    return (
      <div className="bg-white/10 rounded-2xl p-6">
        <div className="text-2xl font-semibold">Keine Budgetdaten vorhanden</div>
        <div className="text-white/70 mt-2">
          Für <strong>{data.filiale}</strong>, Jahr <strong>{data.jahr}</strong>, KW{' '}
          <strong>{data.kw}</strong> existiert noch kein Budgetdatensatz.
        </div>
        <div className="text-white/50 mt-4 text-sm">
          Hinweis: Die Woche wird erst sichtbar, sobald ein Umsatz (z. B. 0 €) initialisiert wurde.
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="bg-white/10 rounded-2xl p-6">
        <div className="text-2xl font-semibold">Keine Daten</div>
        <div className="text-white/70 mt-2">
          Für diese Auswahl liegen aktuell keine Budgetinformationen vor.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="bg-white/10 rounded-2xl p-6 shadow-[3px_3px_6px_rgba(0,0,0,0.35)]"
        >
          <div className="text-2xl font-bold mb-4">Budget-Übersicht</div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {preferredFields.map((f) => {
              const v = pickValue(row, f.keys);
              if (
                v === undefined ||
                v === null ||
                (typeof v === 'string' && v.trim() === '')
              )
                return null;

              return (
                <div key={f.label} className="bg-white/10 rounded-xl p-4">
                  <div className="text-white/70 text-sm">{f.label}</div>
                  <div className="text-xl font-semibold break-words">
                    {String(v)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              onClick={() => setShowRaw((s) => !s)}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              {showRaw ? 'Raw JSON ausblenden' : 'Raw JSON anzeigen'}
            </button>

            {loading && <div className="text-white/70">Aktualisiere…</div>}
          </div>

          {showRaw && (
            <pre className="mt-4 bg-black/30 rounded-xl p-4 overflow-auto text-sm">
              {JSON.stringify(row, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
