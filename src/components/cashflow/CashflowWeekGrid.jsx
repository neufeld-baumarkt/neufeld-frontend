// src/components/cashflow/CashflowWeekGrid.jsx

import CashflowWeekCard from './CashflowWeekCard';

export default function CashflowWeekGrid({
  weeks = [],
  buchungen = [],
}) {
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

  if (!sortedWeeks.length) {
    return (
      <div className="text-center text-white/60 py-12">
        Keine Cashflow-Daten vorhanden.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {sortedWeeks.map((week) => {
        const wochenBuchungen = getBuchungenForWeek(week.kw);

        return (
          <CashflowWeekCard
            key={week.kw}
            week={week}
            buchungenCount={wochenBuchungen.length}
            letzteAenderung={getLetzteAenderung(wochenBuchungen)}
          />
        );
      })}
    </div>
  );
}