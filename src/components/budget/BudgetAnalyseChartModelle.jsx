import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function BudgetAnalyseChartModelle({ weeks }) {
  if (!Array.isArray(weeks) || weeks.length === 0) return null;

  let alt57Ytd = 0;
  let dynamischYtd = 0;
  let tatsaechlichYtd = 0;

  const data = weeks.map((week) => {
    alt57Ytd += Number(week.budget_alt_57_netto || 0);
    dynamischYtd += Number(week.budget_dynamisch_netto || 0);
    tatsaechlichYtd += Number(week.verbraucht_bestellung || 0);

    return {
      kw: `KW ${week.kw}`,
      alt57Ytd,
      dynamischYtd,
      tatsaechlichYtd,
    };
  });

  const formatEuro = (value) =>
    Number(value).toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">
          Budgetmodelle vs. tatsächliches Bestellverhalten
        </h3>
        <p className="mt-1 text-sm text-white/60">
          Kumuliert: 57%-Altsystem, Dynamikmodell und reale Bestellungen
        </p>
      </div>

      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />

            <XAxis
              dataKey="kw"
              tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
            />

            <YAxis
              tickFormatter={formatEuro}
              tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              width={90}
            />

            <Tooltip
              formatter={(value) => formatEuro(value)}
              labelStyle={{ color: '#111827' }}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />

            <Legend wrapperStyle={{ color: 'white', paddingTop: '12px' }} />

            <Line
              type="monotone"
              dataKey="alt57Ytd"
              name="57%-Altsystem YTD"
              stroke="#60a5fa"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="dynamischYtd"
              name="Dynamikmodell YTD"
              stroke="#34d399"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="tatsaechlichYtd"
              name="Tatsächlich bestellt YTD"
              stroke="#f87171"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}