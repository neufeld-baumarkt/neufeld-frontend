// src/components/budget/BudgetWeekNavigator.jsx
import React from 'react';

function clampWeek(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 1;
  if (n < 1) return 1;
  if (n > 53) return 53;
  return n;
}

export default function BudgetWeekNavigator({ jahr, kw, setJahr, setKw }) {
  const prevWeek = () => {
    if (kw > 1) return setKw(kw - 1);
    setJahr(jahr - 1);
    setKw(53);
  };

  const nextWeek = () => {
    if (kw < 53) return setKw(kw + 1);
    setJahr(jahr + 1);
    setKw(1);
  };

  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
      <button
        onClick={prevWeek}
        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
        title="Vorherige Woche"
      >
        ◀
      </button>

      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">Jahr</span>
        <input
          type="number"
          value={jahr}
          onChange={(e) => setJahr(Number(e.target.value))}
          className="w-[100px] px-3 py-2 rounded-lg bg-white/10 text-white outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">KW</span>
        <input
          type="number"
          value={kw}
          onChange={(e) => setKw(clampWeek(e.target.value))}
          className="w-[80px] px-3 py-2 rounded-lg bg-white/10 text-white outline-none"
        />
      </div>

      <button
        onClick={nextWeek}
        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
        title="Nächste Woche"
      >
        ▶
      </button>
    </div>
  );
}
