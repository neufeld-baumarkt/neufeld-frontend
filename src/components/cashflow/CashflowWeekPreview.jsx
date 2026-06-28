// src/components/cashflow/CashflowWeekPreview.jsx

export default function CashflowWeekPreview({
  weeks = [],
  buchungen = [],
  maxWeeks = 6,
}) {
  const formatCurrency = (value) => {
    const number = Number(value || 0);

    return number.toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  const getBuchungenForWeek = (kw) =>
    buchungen.filter((buchung) => Number(buchung.kw) === Number(kw));

  const sortedWeeks = [...weeks]
    .sort((a, b) => Number(b.kw) - Number(a.kw))
    .slice(0, maxWeeks);

  if (!sortedWeeks.length) {
    return (
      <div className="h-[260px] rounded-xl border border-white/10 bg-black/20 flex items-center justify-center text-white/50">
        Keine Cashflow-Daten vorhanden.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedWeeks.map((week) => {
          const wochenBuchungen = getBuchungenForWeek(week.kw);

          return (
            <div
              key={week.kw}
              className="rounded-xl border border-white/10 bg-[#1f1d1d] p-4 shadow-[4px_4px_12px_rgba(0,0,0,0.35)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl font-black text-white">
                    KW {week.kw}
                  </div>

                  <div className="text-white/50 text-sm mt-1">
                    {wochenBuchungen.length} Buchungen
                  </div>
                </div>

                <div className="text-right text-xs text-white/40">
                  Vorschau
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/60">Einnahmen</span>
                  <span className="font-bold text-white">
                    {formatCurrency(week.einnahmen)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/60">Ausgaben</span>
                  <span className="font-bold text-white">
                    {formatCurrency(week.ausgaben)}
                  </span>
                </div>

                <div className="border-t border-white/10 pt-3 flex items-center justify-between gap-4">
                  <span className="font-bold text-white/80">Saldo</span>
                  <span
                    className={`font-black ${
                      Number(week.saldo || 0) >= 0
                        ? 'text-emerald-300'
                        : 'text-red-300'
                    }`}
                  >
                    {formatCurrency(week.saldo)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-white/40">
        Echte Datenvorschau der letzten {sortedWeeks.length} Kalenderwochen.
        Klick öffnet das vollständige Modul.
      </div>
    </div>
  );
}