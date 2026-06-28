// src/components/cashflow/CashflowWeekGrid.jsx

import { useState } from 'react';
import CashflowWeekCard from './CashflowWeekCard';
import CashflowWeekDetailModal from './CashflowWeekDetailModal';

export default function CashflowWeekGrid({
  jahr,
  setJahr,
  bisKw,
  setBisKw,
  years = [],
  weeksOptions = [],
  weeks = [],
  buchungen = [],
  onReload,
  previewMode = false,
}) {
  const [selectedWeek, setSelectedWeek] = useState(null);

  const getBuchungenForWeek = (kw) =>
    buchungen.filter((buchung) => Number(buchung.kw) === Number(kw));

  const getLetzteAenderung = (wochenBuchungen) => {
    if (!wochenBuchungen.length) return null;

    const sorted = [...wochenBuchungen].sort(
      (a, b) =>
        new Date(b.geaendert_am || 0) -
        new Date(a.geaendert_am || 0)
    );

    return sorted[0]?.geaendert_am || null;
  };

  const sortedWeeks = [...weeks].sort(
    (a, b) => Number(b.kw) - Number(a.kw)
  );

  return (
    <>
      {!previewMode && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-5 shadow-[6px_6px_18px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="text-white/60 text-sm font-bold tracking-[0.2em] uppercase">
                Arbeitsbereich
              </div>

              <div className="text-2xl font-bold text-white mt-1">
                Einnahmen / Ausgaben
              </div>

              <div className="text-white/50 text-sm mt-1">
                Jahr {jahr} · bis KW {bisKw}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-3">
                <span className="font-semibold text-white/80">
                  Jahr
                </span>

                <select
                  value={jahr}
                  onChange={(e) => setJahr(Number(e.target.value))}
                  className="px-4 py-3 rounded-lg bg-white/15 text-white outline-none hover:bg-white/20"
                >
                  {years.map((year) => (
                    <option
                      key={year}
                      value={year}
                      className="text-black"
                    >
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-3">
                <span className="font-semibold text-white/80">
                  bis KW
                </span>

                <select
                  value={bisKw}
                  onChange={(e) => setBisKw(Number(e.target.value))}
                  className="px-4 py-3 rounded-lg bg-white/15 text-white outline-none hover:bg-white/20"
                >
                  {weeksOptions.map((week) => (
                    <option
                      key={week}
                      value={week}
                      className="text-black"
                    >
                      KW {week}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="px-5 py-3 rounded-lg bg-white/15 hover:bg-white/25 transition"
              >
                Neue Buchung
              </button>

              <button
                type="button"
                onClick={onReload}
                className="px-5 py-3 rounded-lg bg-white/15 hover:bg-white/25 transition"
              >
                Neu laden
              </button>
            </div>
          </div>
        </div>
      )}

      {!sortedWeeks.length ? (
        <div className="text-center text-white/60 py-12">
          Keine Cashflow-Daten vorhanden.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {sortedWeeks.map((week) => {
            const wochenBuchungen = getBuchungenForWeek(week.kw);

            return (
              <CashflowWeekCard
                key={week.kw}
                week={week}
                buchungenCount={wochenBuchungen.length}
                letzteAenderung={getLetzteAenderung(wochenBuchungen)}
                onClick={() => {
                  if (!previewMode) {
                    setSelectedWeek(week);
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {!previewMode && (
        <CashflowWeekDetailModal
          isOpen={!!selectedWeek}
          jahr={jahr}
          week={selectedWeek}
          buchungen={
            selectedWeek
              ? getBuchungenForWeek(selectedWeek.kw)
              : []
          }
          onReload={onReload}
          onClose={() => setSelectedWeek(null)}
        />
      )}
    </>
  );
}