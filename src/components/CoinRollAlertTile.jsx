import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { coinRollAlerts } from '../lib/tresorzaehlung.mjs';
import { kassenabrechnungApi } from '../lib/kassenabrechnungApi';

export default function CoinRollAlertTile({ branch }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let request;
    async function refresh() {
      request?.abort();
      request = new AbortController();
      const { signal } = request;
      try {
        const { counts } = await kassenabrechnungApi.latestRolls(signal);
        if (!signal.aborted) setAlerts(coinRollAlerts(counts));
      } catch {
        // Keep the last confirmed warnings if a refresh fails.
      }
    }
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      request?.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [branch]);

  if (!alerts.length) return null;
  return <section aria-live="polite" aria-labelledby="coin-roll-alert-title" className="w-full min-w-0 max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-[#353232] text-white shadow-xl">
    <header className="bg-[#800000] px-4 py-3">
      <h2 id="coin-roll-alert-title" className="text-lg font-black">Rollengeld in {branch}</h2>
    </header>
    <ul className="grid gap-2 p-3 sm:p-4">
      {alerts.map(({ cents, label, count, severity }) => {
        const critical = severity === 'critical';
        return <li key={cents} className="flex items-start gap-3 rounded-xl bg-[#2b2929] p-3 text-sm">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${critical ? 'bg-[#800000] text-red-100 ring-red-300/60' : 'bg-amber-950 text-amber-200 ring-amber-400/60'}`}>
            <TriangleAlert size={18} aria-hidden="true" />
          </span>
          <div><strong>{critical ? 'Warnung' : 'Hinweis'} · {label}: nur noch {count} {count === 1 ? 'Rolle' : 'Rollen'}</strong>
            <p className="mt-0.5 text-white/80">{critical ? 'Eine Kleingeldbestellung wird dringend empfohlen.' : 'Bitte prüfen, ob eine Kleingeldbestellung nötig ist.'}</p></div>
        </li>;
      })}
    </ul>
  </section>;
}
