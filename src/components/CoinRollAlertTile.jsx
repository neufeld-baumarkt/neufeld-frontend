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
  return <section aria-live="polite" className="rounded-2xl border border-white/15 bg-[#454242] p-5 text-white">
    <h2 className="text-xl font-black">Rollengeld in {branch}</h2>
    <ul className="mt-3 grid gap-2">
      {alerts.map(({ cents, label, count, severity }) => {
        const critical = severity === 'critical';
        return <li key={cents} className={`flex items-start gap-3 rounded-xl border p-3 ${critical ? 'border-red-300 bg-red-50 text-red-900' : 'border-yellow-300 bg-yellow-50 text-yellow-950'}`}>
          <TriangleAlert className="shrink-0" aria-hidden="true" />
          <div><strong>{critical ? 'Warnung' : 'Hinweis'} · {label}: nur noch {count} {count === 1 ? 'Rolle' : 'Rollen'}</strong>
            <p>{critical ? 'Eine Kleingeldbestellung wird dringend empfohlen.' : 'Bitte prüfen, ob eine Kleingeldbestellung nötig ist.'}</p></div>
        </li>;
      })}
    </ul>
  </section>;
}
