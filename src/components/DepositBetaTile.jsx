import { useEffect, useState } from 'react';
import { Check, Clock3, Minus, TriangleAlert } from 'lucide-react';
import { getToken } from '../lib/auth';
import WeekPicker from './WeekPicker';

const statuses = {
  green: { style: 'bg-emerald-950 text-emerald-200 ring-emerald-400/50', label: 'Erledigt', icon: Check },
  yellow: { style: 'bg-amber-950 text-amber-200 ring-amber-400/60', label: 'Offen bis 12 Uhr', icon: Clock3 },
  red: { style: 'bg-[#800000] text-red-100 ring-red-300/60', label: 'Überfällig', icon: TriangleAlert },
  planned: { style: 'bg-white/5 text-white/70 ring-white/20', label: 'Geplant', icon: Minus },
};

function calendarLabel(date) {
  return date.split('-').reverse().join('.');
}

function StatusIcon({ entry }) {
  const { style, label, icon: Icon } = statuses[entry.status];
  const description = entry.missingDates.length && entry.status !== 'planned'
    ? `${label}. Offene Tage: ${entry.missingDates.map(calendarLabel).join(', ')}`
    : label;
  return (
    <span title={description} className={`inline-flex size-8 items-center justify-center rounded-full ring-1 ${style}`}>
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only">{description}</span>
    </span>
  );
}

export default function DepositBetaTile({ className = 'mt-6' }) {
  const [data, setData] = useState(null);
  const [requestedWeek, setRequestedWeek] = useState();
  const [weekError, setWeekError] = useState(false);
  useEffect(() => {
    const apiOrigin = import.meta.env.VITE_API_URL;
    if (!apiOrigin) return;
    const controller = new AbortController();
    let timer;
    async function refresh() {
      const token = getToken();
      if (!token) {
        setData(null);
        return;
      }
      try {
        const query = requestedWeek ? `?week=${encodeURIComponent(requestedWeek.start)}` : '';
        const response = await fetch(`${apiOrigin}/api/deposit-beta${query}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        if ([404, 401, 403].includes(response.status)) {
          if (!controller.signal.aborted) setData(null);
          return;
        }
        if (!response.ok) throw new Error('Einzahlungsstatus');
        const next = await response.json();
        if (controller.signal.aborted) return;
        setData(next);
        setWeekError(false);
      } catch {
        if (controller.signal.aborted) return;
        setWeekError(true);
      }
      timer = window.setTimeout(refresh, 60_000);
    }
    refresh();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [requestedWeek]);

  const current = data?.cycles?.find(cycle => cycle.dueDate === data.currentDueDate);
  const branches = data?.cycles?.[0]?.branches;
  if (!branches?.length) return null;
  const overview = data.cycles.length > 1;
  const verified = current?.branches.filter(entry => entry.status === 'green').length;
  const reminder = branches[0];
  const loading = requestedWeek && requestedWeek.start !== data.week?.start && !weekError;
  return (
    <section className={`w-full min-w-0 max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-[#353232] text-white shadow-xl ${className}`} aria-labelledby="deposit-beta-title">
      <header className="bg-[#800000] px-4 py-3">
        <h2 id="deposit-beta-title" className="text-lg font-black">Einzahlungen</h2>
      </header>
      <div className="p-3 sm:p-4">
        {overview && data.week && <WeekPicker week={data.week} loading={Boolean(loading)} onChange={start => {
          setWeekError(false);
          setRequestedWeek({ start });
        }} />}
        {weekError && <p className="mb-2 text-xs text-white/80" role="status">Einzahlungsstatus vorübergehend nicht verfügbar.</p>}
        {current && <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
          <span className="text-white/80">{calendarLabel(current.dueDate)} · 12 Uhr</span>
          {overview && <span className="font-bold">{verified}/{current.branches.length} erledigt</span>}
        </div>}
        {overview ? (
          <table className="w-full table-fixed rounded-xl bg-[#2b2929] text-sm">
            <thead>
              <tr className="text-white/75">
                <th scope="col" className="px-2 py-2 text-left">Filiale</th>
                {data.cycles.map((cycle, index) => (
                  <th key={cycle.dueDate} scope="col" className={`w-12 py-2 ${cycle === current ? 'bg-white/10 text-white' : ''}`}>
                    <abbr title={calendarLabel(cycle.dueDate)} className="no-underline">{['Mo', 'Mi', 'Fr'][index]}</abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branches.map((entry, index) => (
                <tr key={entry.branch} className="border-t border-white/10">
                  <th scope="row" className="break-words px-2 py-2 text-left">{entry.branch}</th>
                  {data.cycles.map(cycle => (
                    <td key={cycle.dueDate} className={`py-2 text-center ${cycle === current ? 'bg-white/10' : ''}`}>
                      <StatusIcon entry={cycle.branches[index]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-[#2b2929] p-3" aria-live="polite">
            <StatusIcon entry={reminder} />
            <div className="min-w-0 break-words">
              <h3 className="font-bold">{reminder.branch} · {statuses[reminder.status].label}</h3>
              {reminder.missingDates.length > 0 && (
                <p className="text-sm text-white/80">Offene Tage: {reminder.missingDates.map(calendarLabel).join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
