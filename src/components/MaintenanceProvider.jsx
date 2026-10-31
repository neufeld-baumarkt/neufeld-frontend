import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getToken, getUser, logout } from '../lib/auth';
import { defaultMaintenanceStatus, normalizeMaintenanceStatus } from '../lib/maintenancePolicy.mjs';

const API_ORIGIN = import.meta.env.VITE_API_URL;
const MaintenanceContext = createContext({ status: defaultMaintenanceStatus, refresh: async () => {} });

async function statusRequest(path = '/status', options = {}) {
  const token = getToken();
  const response = await fetch(`${API_ORIGIN}/api/maintenance${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.message || 'Wartungsstatus nicht verfügbar.'), { status: response.status });
  return payload;
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}

export default function MaintenanceProvider({ children }) {
  const [status, setStatus] = useState(defaultMaintenanceStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const user = useMemo(() => getUser(), [location.pathname, status.revision]);

  const refresh = useCallback(async () => {
    try {
      setStatus(normalizeMaintenanceStatus(await statusRequest()));
      setError('');
    } catch (failure) {
      setStatus(defaultMaintenanceStatus);
      setError(failure.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (status.mode === 'maintenance' && user && user.role !== 'Admin') {
      logout();
      navigate('/', { replace: true });
    }
  }, [navigate, status.mode, user]);

  const mutate = async (path, body) => {
    setBusy(true);
    setError('');
    try {
      const next = normalizeMaintenanceStatus(await statusRequest(path, {
        method: 'POST', body: JSON.stringify(body || {}),
      }));
      setStatus(next);
      if (path === '/activate') {
        logout();
        navigate('/', { replace: true });
      }
      return next;
    } catch (failure) {
      if (failure.status === 401) {
        logout();
        navigate('/', { replace: true });
      }
      setError(failure.message);
      throw failure;
    } finally { setBusy(false); }
  };

  const value = useMemo(() => ({ status, refresh, busy, error }), [status, refresh, busy, error]);
  const admin = user?.role === 'Admin';

  if (status.mode === 'maintenance' && admin) {
    return <MaintenanceContext.Provider value={value}>
      <main className="flex min-h-dvh items-center justify-center bg-[#292626] p-5 text-white">
        <section className="w-full max-w-2xl rounded-3xl border-2 border-amber-300/50 bg-[#3a3737] p-7 text-center shadow-2xl sm:p-10">
          <div className="text-sm font-black uppercase tracking-[.3em] text-amber-300">Fuchsbau · Wartungsmodus</div>
          <h1 className="mt-4 text-4xl font-black sm:text-6xl">Bahn gesperrt</h1>
          <p className="mt-5 text-lg text-white/70">Alle bisherigen Sitzungen wurden getrennt. Nach erfolgreichem DB-, Backend- und Frontend-Test darf die Anwendung hier wieder freigegeben werden.</p>
          {error && <div className="mt-5 rounded-xl border border-red-300/40 bg-red-500/10 p-3 text-red-100">{error}</div>}
          <button disabled={busy} onClick={() => mutate('/open')} className="mt-7 min-h-14 w-full rounded-xl bg-emerald-400 px-6 text-lg font-black text-emerald-950 disabled:opacity-50">{busy ? 'Freigabe läuft …' : 'Anwendung wieder freigeben'}</button>
          <button onClick={() => { logout(); navigate('/', { replace: true }); }} className="mt-3 min-h-12 w-full rounded-xl border border-white/20 px-5 font-bold">Admin neu anmelden</button>
        </section>
      </main>
    </MaintenanceContext.Provider>;
  }

  return <MaintenanceContext.Provider value={value}>
    {status.mode !== 'open' && <div role="status" className={`relative z-[1000] px-4 py-3 text-center font-black ${status.mode === 'draining' ? 'bg-amber-300 text-amber-950' : status.mode === 'maintenance' ? 'bg-red-700 text-white' : 'bg-slate-900 text-white'}`}>
      {status.mode === 'draining' ? `${status.message || 'Wartung wird vorbereitet.'} Laufende Kassenprozesse bitte abschließen. Keine neuen Vorgänge beginnen.` : status.mode === 'maintenance' ? 'Wartungsmodus aktiv. Die Anmeldung ist nur für die technische Freigabe möglich.' : `Betriebsstatus nicht verfügbar. Neue Vorgänge sind vorsorglich gesperrt.${error ? ` ${error}` : ''}`}
      {status.mode === 'draining' && admin && <span className="ml-3 inline-flex gap-2">
        <button disabled={busy || status.activeCashProcesses > 0} onClick={() => mutate('/activate')} className="rounded-lg bg-[#800000] px-3 py-1.5 text-white disabled:opacity-40">{status.activeCashProcesses > 0 ? `${status.activeCashProcesses} Prozess(e) aktiv` : 'Sessions trennen'}</button>
        <button disabled={busy} onClick={() => mutate('/open')} className="rounded-lg border border-amber-950/30 px-3 py-1.5">Abbrechen</button>
      </span>}
    </div>}
    {status.mode === 'open' && admin && <button type="button" onClick={() => mutate('/drain')} disabled={busy} className="fixed bottom-4 right-4 z-[900] rounded-full border-2 border-amber-300 bg-[#800000] px-5 py-3 font-black text-white shadow-2xl disabled:opacity-50">Fuchsbau</button>}
    {children}
  </MaintenanceContext.Provider>;
}
