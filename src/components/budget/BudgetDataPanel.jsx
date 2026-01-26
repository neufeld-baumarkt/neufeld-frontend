// src/components/budget/BudgetDataPanel.jsx
import React, { useMemo, useState } from 'react';

function normalizeToArray(payload) {
  if (!payload) return [];

  // Backend-Info-Antwort: bewusst KEINE Daten (404-Message etc.)
  if (
    typeof payload === 'object' &&
    payload.message &&
    String(payload.message).includes('Keine Budgetdaten')
  ) {
    return [];
  }

  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'object') return [payload];
  return [];
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const s = String(value).trim().replace(',', '.');
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function formatEuroValue(value) {
  const n = toNumber(value);
  if (n === null) return { text: '—', isNegative: false };

  const text = n.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €';

  return { text, isNegative: n < 0 };
}

export default function BudgetDataPanel({ data, loading }) {
  const [showRaw, setShowRaw] = useState(false);

  const rows = useMemo(() => normalizeToArray(data), [data]);

  const isNoDataMessage =
    data &&
    typeof data === 'object' &&
    data.message &&
    String(data.message).includes('Keine Budgetdaten');

  // Für die UI bleibt NUR das Wichtige:
  // - Budget freigegeben (netto)
  // - Verbraucht
  // - Rest (netto)
  const keyTiles = [
    {
      label: 'Budget freigegeben (netto)',
      keys: ['budget_freigegeben_netto', 'budget_freigegeben', 'budget'],
    },
    {
      label: 'Verbraucht',
      keys: ['verbraucht'],
    },
    {
      label: 'Rest (netto)',
      keys: ['rest_netto', 'rest'],
    },
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

  if (isNoDataMessage) {
    return (
      <div className="bg-white/10 rounded-2xl p-6">
        <div className="text-2xl font-semibold">Keine Budgetdaten vorhanden</div>
        <div className="text-white/70 mt-2">
          Für diese Auswahl existiert noch kein Budgetdatensatz.
        </div>
        <div className="text-white/50 mt-4 text-sm">
          Hinweis: Die Woche wird erst sichtbar, sobald ein Umsatz initialisiert wurde.
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

          {/* Nur 3 relevante Kacheln */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {keyTiles.map((t) => {
              const raw = pickValue(row, t.keys);
              const { text, isNegative } = formatEuroValue(raw);

              return (
                <div key={t.label} className="bg-white/10 rounded-xl p-4">
                  <div className="text-white/70 text-sm">{t.label}</div>
                  <div
                    className={[
                      'text-2xl font-bold break-words',
                      isNegative ? 'text-red-400' : 'text-white',
                    ].join(' ')}
                  >
                    {text}
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
