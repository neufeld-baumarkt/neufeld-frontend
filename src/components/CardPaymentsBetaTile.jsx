import { useEffect, useRef, useState } from 'react';
import { Check, Clock3, Info, Link2, Minus, CircleHelp } from 'lucide-react';
import { getToken } from '../lib/auth';
import WeekPicker from './WeekPicker';

const pending = 'bg-amber-950 text-amber-200 ring-amber-400/60';
const historical = 'bg-white/5 text-white/80 ring-white/25';
const status = {
  future: [Minus, 'Ausstehend · Verkaufstag liegt in der Zukunft', historical],
  import_pending: [Clock3, 'In Bearbeitung · Qlik-Werte fehlen', pending],
  review_pending: [Clock3, 'In Bearbeitung · Qlik-Werte liegen vor, Mirkos Prüfung steht aus', pending],
  verified: [Check, 'Von Mirko bestätigt', 'bg-emerald-950 text-emerald-200 ring-emerald-400/50'],
  matched: [Link2, 'Von Mirko bestätigt und mit einer Sammelüberweisung abgeglichen', 'bg-blue-950 text-blue-200 ring-blue-400/60'],
  past_import_pending: [CircleHelp, 'Offener früherer Verkaufstag · Qlik-Werte fehlen', historical],
  past_review_pending: [CircleHelp, 'Offener früherer Verkaufstag · Prüfung ausstehend', historical],
};

const paymentLabel = { EC_CASH: 'EC', KREDITKARTE: 'Kreditkarten' };
const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const dateLabel = date => date.split('-').reverse().join('.');

export default function CardPaymentsBetaTile() {
  const [week, setWeek] = useState();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState('');
  const touch = useRef(null);

  useEffect(() => {
    const token = getToken();
    const origin = import.meta.env.VITE_API_URL;
    if (!token || !origin) return;
    const controller = new AbortController();
    const query = week ? `?week=${encodeURIComponent(week.start)}` : '';
    fetch(`${origin}/api/card-payments-beta${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    }).then(async response => {
      if ([401, 403, 404].includes(response.status)) {
        if (!controller.signal.aborted) setData(null);
        return;
      }
      if (!response.ok) throw new Error('Kartenstatus');
      const value = await response.json();
      if (!controller.signal.aborted) { setData(value); setError(false); }
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [week]);

  if (!data) return null;
  const loading = !error && week !== undefined && week.start !== data.start;
  function navigate(target) {
    if (loading) return;
    setDetail('');
    setError(false);
    setWeek({ start: target });
  }

  return (
    <section className="w-full min-w-0 max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-[#353232] text-white shadow-xl" aria-labelledby="card-payments-title">
      <header className="bg-[#800000] px-4 py-3">
        <h2 id="card-payments-title" className="text-lg font-black">EC &amp; Kreditkarten</h2>
      </header>
      <div className="p-2 sm:p-3">
        <WeekPicker week={data} onChange={navigate} loading={loading} />
        <div className="touch-pan-y" onTouchStart={event => {
          const point = event.touches[0];
          touch.current = event.touches.length === 1 ? [point.clientX, point.clientY] : null;
        }} onTouchCancel={() => { touch.current = null; }} onTouchEnd={event => {
          if (!touch.current) return;
          const [left, top] = touch.current;
          touch.current = null;
          const point = event.changedTouches[0];
          const distance = point.clientX - left;
          if (Math.abs(distance) >= 48 && Math.abs(distance) > 1.5 * Math.abs(point.clientY - top)) {
            navigate(distance < 0 ? data.next : data.previous);
          }
        }}>
          <table className="w-full table-fixed text-center text-[10px] sm:text-xs" aria-label="Kartenzahlungsstatus nach Verkaufstag" aria-busy={loading}>
            <thead><tr>
              <th scope="col" className="w-[66px] text-left sm:w-[84px]">Zahlungsart</th>
              {data.days.map((day, i) => <th key={day} scope="col" title={dateLabel(day)}>{weekdays[i]}</th>)}
            </tr></thead>
            {data.branches.map(({ branch, rows }) => <tbody key={branch} aria-label={branch}>
              <tr className="border-t border-white/15"><th colSpan={7} scope="rowgroup" className="py-1 text-left font-bold">{branch}</th></tr>
              {rows.map(row => <tr key={row.code}>
                <th scope="row" className="text-left font-medium">{paymentLabel[row.code]}</th>
                {row.statuses.map((key, index) => {
                  const [Icon, label, classes] = status[key];
                  const description = `${branch} · ${paymentLabel[row.code]} · ${dateLabel(data.days[index])} · ${label}`;
                  return <td key={data.days[index]} className="py-0.5">
                    <button type="button" title={description} aria-label={description}
                      className={`mx-auto inline-flex h-6 w-full max-w-7 items-center justify-center rounded-md ring-1 ring-inset ${classes}`}
                      onClick={() => setDetail(description)}><Icon size={13} aria-hidden="true" /></button>
                  </td>;
                })}
              </tr>)}
            </tbody>)}
          </table>
        </div>
        {detail && <p className="mt-2 text-xs" role="status">{detail}</p>}
        {error && <p className="mt-2 text-xs" role="status">Die angezeigte Woche konnte nicht gewechselt werden.</p>}
        <details className="mt-2 text-xs text-white/80">
          <summary className="cursor-pointer py-1"><Info size={13} className="mr-1 inline" aria-hidden="true" /> Farben und Symbole</summary>
          <ul className="space-y-1 pb-1">
            {[['future', 'Grau'], ['review_pending', 'Gelb'], ['verified', 'Grün'], ['matched', 'Blau'], ['past_review_pending', 'Neutral']].map(([key, color]) => {
              const [Icon, label] = status[key];
              return <li key={key}><Icon size={12} className="mr-1 inline" aria-hidden="true" />{color} · {key === 'review_pending' ? 'Heute offen, Qlik-Werte fehlen oder Prüfung steht aus' : label}</li>;
            })}
          </ul>
        </details>
      </div>
    </section>
  );
}
