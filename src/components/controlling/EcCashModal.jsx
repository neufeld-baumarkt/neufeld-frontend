// src/components/controlling/EcCashModal.jsx

import { useMemo, useState } from 'react';

const MONTHS_2026 = [
  { value: 1, label: "Jan'26", days: 31 },
  { value: 2, label: "Feb'26", days: 28 },
  { value: 3, label: "März'26", days: 31 },
  { value: 4, label: "Apr'26", days: 30 },
  { value: 5, label: "Mai'26", days: 31 },
  { value: 6, label: "Juni'26", days: 30 },
  { value: 7, label: "Juli'26", days: 31 },
  { value: 8, label: "Aug'26", days: 31 },
  { value: 9, label: "Sep'26", days: 30 },
  { value: 10, label: "Okt'26", days: 31 },
  { value: 11, label: "Nov'26", days: 30 },
  { value: 12, label: "Dez'26", days: 31 },
];

const BRANCH_COLUMNS = [
  { key: 'telgte', label: 'Telgte' },
  { key: 'ahaus', label: 'Ahaus' },
  { key: 'vreden', label: 'Vreden' },
  { key: 'muenster', label: 'Münster' },
];

function formatDate(day, month) {
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.2026`;
}

function buildEmptyRows(month) {
  return Array.from({ length: month.days }, (_, index) => ({
    day: index + 1,
    datum: formatDate(index + 1, month.value),
  }));
}

function MonthTabs({ activeMonth, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {MONTHS_2026.map((month) => {
        const active = month.value === activeMonth.value;

        return (
          <button
            key={month.value}
            type="button"
            onClick={() => onChange(month)}
            className={`px-4 py-2 rounded-t-lg border text-sm font-bold transition ${
              active
                ? 'bg-white border-black/30 text-[#1f1f1f] shadow'
                : 'bg-[#d9d9d9] border-black/20 text-black/55 hover:bg-white/80'
            }`}
          >
            {month.label}
          </button>
        );
      })}
    </div>
  );
}

function PaymentBlock({ title, rows }) {
  return (
    <div className="border border-black/40 bg-white overflow-hidden shadow-sm">
      <div className="bg-[#b7b7b7] border-b border-black/40 px-4 py-2 font-black tracking-wide text-center uppercase">
        {title}
      </div>

      <div className="overflow-auto">
        <div className="min-w-[1380px]">
          <div className="grid grid-cols-[120px_repeat(8,130px)_170px] text-xs font-bold border-b border-black/40">
            <div className="bg-[#eeeeee] border-r border-black/30 px-2 py-2 flex items-center justify-center">
              Datum
            </div>

            {BRANCH_COLUMNS.map((branch) => (
              <div key={branch.key} className="contents">
                <div className="bg-[#eeeeee] border-r border-black/30 px-2 py-2 text-center">
                  {branch.label} IST
                </div>
                <div className="bg-[#eeeeee] border-r border-black/30 px-2 py-2 text-center">
                  {branch.label} SOLL
                </div>
              </div>
            ))}

            <div className="bg-[#eeeeee] px-2 py-2 text-center">
              Gesamt Überweisung
            </div>
          </div>

          {rows.map((row) => (
            <div
              key={row.datum}
              className="grid grid-cols-[120px_repeat(8,130px)_170px] text-xs border-b border-black/20 last:border-b-0 min-h-[34px]"
            >
              <div className="bg-white border-r border-black/20 px-2 py-2 font-semibold text-center">
                {row.datum}
              </div>

              {BRANCH_COLUMNS.map((branch) => (
                <div key={`${row.datum}-${branch.key}`} className="contents">
                  <div className="bg-white border-r border-black/20 px-2 py-2 text-right text-black/25">
                    -
                  </div>
                  <div className="bg-white border-r border-black/20 px-2 py-2 text-right text-black/25">
                    -
                  </div>
                </div>
              ))}

              <div className="bg-white px-2 py-2 text-right text-black/25">
                -
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EcCashModal() {
  const [activeMonth, setActiveMonth] = useState(MONTHS_2026[0]);

  const rows = useMemo(() => buildEmptyRows(activeMonth), [activeMonth]);

  return (
    <div className="h-full rounded-2xl border border-white/10 bg-[#f5f2eb] text-[#1f1f1f] overflow-hidden flex flex-col">
      <div className="bg-[#d9d9d9] border-b border-black/20 px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-2xl font-black">
              Controlling EC Cash / Kreditkarte 2026
            </div>
            <div className="text-sm text-black/60 mt-1">
              Excel-nahe Monatsansicht · Darstellung Phase 1
            </div>
          </div>

          <div className="text-right text-sm text-black/60">
            Aktiver Monat
            <div className="text-xl font-black text-black mt-1">
              {activeMonth.label}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-5 shrink-0">
        <MonthTabs activeMonth={activeMonth} onChange={setActiveMonth} />
      </div>

      <div className="p-6 overflow-auto flex-1">
        <div className="space-y-8">
          <PaymentBlock title="EC Cash Buchungen" rows={rows} />
          <PaymentBlock title="Kreditkarte" rows={rows} />
        </div>
      </div>
    </div>
  );
}
