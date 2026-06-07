// src/components/cashflow/CashflowWeekCard.jsx

function formatEuro(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(number);
}

function formatDateTime(value) {
  if (!value) return 'Keine Änderung';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Keine Änderung';
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function CashflowWeekCard({ week, buchungenCount, letzteAenderung }) {
  const saldo = Number(week?.saldo || 0);
  const saldoClass = saldo >= 0 ? 'text-emerald-300' : 'text-red-300';

  return (
    <button
      type="button"
      className="w-full text-left bg-black/25 border border-white/10 rounded-2xl p-5 shadow-[4px_4px_14px_rgba(0,0,0,0.35)] hover:bg-white/10 hover:border-white/20 transition"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="text-3xl font-bold text-white">KW {week.kw}</div>
          <div className="text-white/55 mt-1">
            {buchungenCount} Buchungen
          </div>
        </div>

        <div className="text-right">
          <div className="text-white/50 text-sm">Letzte Änderung</div>
          <div className="text-white/80 text-sm mt-1">
            {formatDateTime(letzteAenderung)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-white/65">Einnahmen</span>
          <span className="font-semibold text-white">
            {formatEuro(week.einnahmen)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-white/65">Ausgaben</span>
          <span className="font-semibold text-white">
            {formatEuro(week.ausgaben)}
          </span>
        </div>

        <div className="border-t border-white/10 pt-3 flex items-center justify-between gap-4">
          <span className="text-white/80 font-semibold">Saldo</span>
          <span className={`font-bold ${saldoClass}`}>
            {formatEuro(week.saldo)}
          </span>
        </div>
      </div>
    </button>
  );
}