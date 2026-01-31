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

  const text =
    n.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €';

  return { text, isNegative: n < 0 };
}

function formatPercent(value) {
  const n = toNumber(value);
  if (n === null) return '—';
  return (
    n.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' %'
  );
}

export default function BudgetDataPanel({ data, loading, role = '' }) {
  const rows = useMemo(() => normalizeToArray(data), [data]);

  // Per-Row UI-State (falls jemals mehr als 1 Row kommt)
  const [detailsOpenByIdx, setDetailsOpenByIdx] = useState({});
  const [showRawByIdx, setShowRawByIdx] = useState({});

  const isAdmin = role === 'Admin';
  const isSupervisor = role === 'Supervisor';
  const isGf = role === 'Geschäftsführer';
  const isPrivileged = isAdmin || isSupervisor; // sieht "alles" (im Sinne der erweiterten YTD-Kacheln)

  const isNoDataMessage =
    data &&
    typeof data === 'object' &&
    data.message &&
    String(data.message).includes('Keine Budgetdaten');

  // Zugeklappt: NUR diese 3
  const keyTiles = [
    {
      label: 'Budget freigegeben (netto)',
      keys: ['budget_freigegeben_netto', 'budget_freigegeben', 'budget'],
    },
    {
      label: 'Verbraucht (Bestellungen)',
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

  const toggleDetails = (idx) => {
    setDetailsOpenByIdx((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleRaw = (idx) => {
    setShowRawByIdx((prev) => ({ ...prev, [idx]: !prev[idx] }));
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
      {rows.map((row, idx) => {
        const detailsOpen = Boolean(detailsOpenByIdx[idx]);
        const showRaw = Boolean(showRawByIdx[idx]);

        const rowKw = pickValue(row, ['kw']);
        const rowJahr = pickValue(row, ['jahr']);

        // Kumuliert (Jahr) / formerly YTD
                const umsatzYtdBrutto = pickValue(row, ['umsatz_ytd_brutto']);
        const budgetYtdNetto = pickValue(row, ['budget_ytd_netto']);
        const verbrauchtYtd = pickValue(row, ['verbraucht_ytd']);
        const restYtdNetto = pickValue(row, ['rest_ytd_netto']);
                const istVerbrauchSatzYtdProzent = pickValue(row, ['ist_verbrauch_satz_ytd_prozent']);
        const istVerbrauchSatzYtdExklAktionenBrutto = pickValue(row, ['ist_verbrauch_satz_ytd_prozent_exkl_aktionen_brutto']);
        const istVerbrauchSatzYtdInklAktionenBrutto = pickValue(row, ['ist_verbrauch_satz_ytd_prozent_inkl_aktionen_brutto']);

        const verbrauchtAktionKw = pickValue(row, ['verbraucht_aktion']);
        const verbrauchtGesamtKw = pickValue(row, ['verbraucht_gesamt']);
        const verbrauchtAktionYtd = pickValue(row, ['verbraucht_aktion_ytd']);
        const verbrauchtGesamtYtd = pickValue(row, ['verbraucht_gesamt_ytd']);

        // Für GF/Manager/Filialen: nur 3 Werte
        // Für Admin/Supervisor: zusätzlich Rest + Budget-Satz
                const euroTilesKumuliert = [
          { label: 'Umsatz kumuliert (brutto)', value: umsatzYtdBrutto },
          { label: 'Budget kumuliert (netto)', value: budgetYtdNetto },
          { label: 'Verbraucht kumuliert (Bestellungen)', value: verbrauchtYtd },
          { label: 'Aktionen kumuliert', value: verbrauchtAktionYtd },
          { label: 'Gesamt kumuliert (Bestellungen + Aktionen)', value: verbrauchtGesamtYtd },
          { label: 'Rest kumuliert (netto)', value: restYtdNetto },
        ];

                const percentTileVisible = true;
        const percentTileAvailable =
          (istVerbrauchSatzYtdProzent !== undefined && istVerbrauchSatzYtdProzent !== null) ||
          (istVerbrauchSatzYtdExklAktionenBrutto !== undefined && istVerbrauchSatzYtdExklAktionenBrutto !== null) ||
          (istVerbrauchSatzYtdInklAktionenBrutto !== undefined && istVerbrauchSatzYtdInklAktionenBrutto !== null);

                const detailsAvailable =
          // Woche (KW)
          verbrauchtAktionKw !== undefined ||
          verbrauchtGesamtKw !== undefined ||
          // Kumuliert (YTD)
          umsatzYtdBrutto !== undefined ||
          budgetYtdNetto !== undefined ||
          verbrauchtYtd !== undefined ||
          restYtdNetto !== undefined ||
          verbrauchtAktionYtd !== undefined ||
          verbrauchtGesamtYtd !== undefined ||
          istVerbrauchSatzYtdProzent !== undefined ||
          istVerbrauchSatzYtdExklAktionenBrutto !== undefined ||
          istVerbrauchSatzYtdInklAktionenBrutto !== undefined ||
          (isAdmin && showRaw);

        const kumuliertTitle =
          rowJahr && rowKw
            ? `Kumuliert (Jahr ${rowJahr} bis KW ${rowKw})`
            : 'Kumuliert (Jahr)';

        return (
          <div
            key={idx}
            className="bg-white/10 rounded-2xl p-6 shadow-[3px_3px_6px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="text-2xl font-bold">Budget-Übersicht</div>
              {loading && <div className="text-white/70">Aktualisiere…</div>}
            </div>

            {/* Zugeklappt: nur 3 relevante Kacheln */}
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

            {/* Accordion */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => toggleDetails(idx)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold">Kumuliert</span>
                  {detailsAvailable && (
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80">
                      verfügbar
                    </span>
                  )}
                </div>
                <span className="text-xl leading-none">{detailsOpen ? '▴' : '▾'}</span>
              </button>

              {detailsOpen && (
                <div className="mt-4 bg-black/20 rounded-xl p-4">
                  <div className="text-white/80 font-semibold mb-2">{kumuliertTitle}</div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {euroTilesKumuliert.map((t) => {
                      const { text, isNegative } = formatEuroValue(t.value);
                      return (
                        <div key={t.label} className="bg-white/10 rounded-lg p-3">
                          <div className="text-white/70 text-xs">{t.label}</div>
                          <div
                            className={[
                              'font-semibold break-words',
                              isNegative ? 'text-red-400' : 'text-white',
                            ].join(' ')}
                          >
                            {text}
                          </div>
                        </div>
                      );
                    })}

                    {percentTileVisible && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-white/70 text-xs">Verbrauchs-Satz kumuliert</div>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-white/70 text-[11px]">Bestellungen (netto)</span>
                            <span className="text-white font-semibold">{(istVerbrauchSatzYtdProzent !== undefined && istVerbrauchSatzYtdProzent !== null) ? formatPercent(istVerbrauchSatzYtdProzent) : '—'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-white/70 text-[11px]">exkl. Aktionen (brutto)</span>
                            <span className="text-white font-semibold">{(istVerbrauchSatzYtdExklAktionenBrutto !== undefined && istVerbrauchSatzYtdExklAktionenBrutto !== null) ? formatPercent(istVerbrauchSatzYtdExklAktionenBrutto) : '—'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-white/70 text-[11px]">inkl. Aktionen (brutto)</span>
                            <span className="text-white font-semibold">{(istVerbrauchSatzYtdInklAktionenBrutto !== undefined && istVerbrauchSatzYtdInklAktionenBrutto !== null) ? formatPercent(istVerbrauchSatzYtdInklAktionenBrutto) : '—'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="mt-4 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => toggleRaw(idx)}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                      >
                        {showRaw ? 'JSON ausblenden' : 'JSON anzeigen'}
                      </button>
                    </div>
                  )}

                  {isAdmin && showRaw && (
                    <pre className="mt-4 bg-black/30 rounded-xl p-4 overflow-auto text-sm">
                      {JSON.stringify(row, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
