import React from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export default function BudgetAnalyseChartMix({ kpis }) {
  if (!kpis) return null;

  const getNumber = (value) => {
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? 0 : numberValue;
  };

  const bestellungen = getNumber(kpis.verbrauch_bestellung_ytd);
  const aktionen = getNumber(kpis.verbrauch_aktion_ytd);
  const gesamt = getNumber(kpis.verbrauch_gesamt_ytd);
  const sonderbestellungen = Math.max(gesamt - bestellungen - aktionen, 0);

  const data = [
    { name: 'Bestellungen', value: bestellungen, color: '#34d399' },
    { name: 'Aktionen', value: aktionen, color: '#f59e0b' },
    { name: 'Sonderbestellungen', value: sonderbestellungen, color: '#a78bfa' },
  ].filter((item) => item.value > 0);

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
        <h3 className="text-lg font-bold text-white">Verbrauchsmix YTD</h3>
        <p className="mt-1 text-sm text-white/60">
          Anteil von Bestellungen, Aktionen und Sonderbestellungen am Gesamtverbrauch
        </p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={3}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) => formatEuro(value)}
              labelStyle={{ color: '#111827' }}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />

            <Legend wrapperStyle={{ color: 'white', paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}