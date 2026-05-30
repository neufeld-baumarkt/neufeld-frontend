import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function BudgetAnalyseChartWochenverbrauch({ weeks }) {
  if (!Array.isArray(weeks) || weeks.length === 0) return null;

  const data = weeks.map((week) => {
    const bestellungen = Number(week.verbraucht_bestellung || 0);
    const aktionen = Number(week.verbraucht_aktion || 0);
    const gesamt = Number(week.verbraucht_gesamt || 0);
    const sonderbestellungen = Math.max(gesamt - bestellungen - aktionen, 0);

    return {
      kw: `KW ${week.kw}`,
      bestellungen,
      aktionen,
      sonderbestellungen,
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
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">
          Wochenverbrauch nach Herkunft
        </h3>
        <p className="mt-1 text-sm text-white/60">
          Bestellungen, Aktionen und rechnerisch abgeleitete Sonderbestellungen je KW
        </p>
      </div>

      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 8 }}>
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

            <Bar
              dataKey="bestellungen"
              name="Bestellungen"
              stackId="verbrauch"
              fill="#34d399"
            />

            <Bar
              dataKey="aktionen"
              name="Aktionen"
              stackId="verbrauch"
              fill="#f59e0b"
            />

            <Bar
              dataKey="sonderbestellungen"
              name="Sonderbestellungen"
              stackId="verbrauch"
              fill="#a78bfa"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}