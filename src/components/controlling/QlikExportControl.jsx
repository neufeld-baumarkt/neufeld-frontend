import { Component, useCallback, useEffect, useState } from 'react';

const ACTIVE = new Set(['REQUESTED', 'EXPORT_RUNNING', 'IMPORT_RUNNING']);
const STATUS = {
  REQUESTED: ['Angefordert', 'border-sky-400/50 bg-sky-400/15 text-sky-100'],
  EXPORT_RUNNING: ['Export läuft', 'border-amber-400/60 bg-amber-400/15 text-amber-100'],
  IMPORT_RUNNING: ['Import läuft', 'border-amber-400/60 bg-amber-400/15 text-amber-100'],
  SUCCEEDED: ['Erfolgreich', 'border-emerald-400/60 bg-emerald-400/15 text-emerald-100'],
  NO_DATA: ['Keine Daten', 'border-slate-400/50 bg-slate-400/15 text-slate-100'],
  FAILED: ['Fehler', 'border-red-400/60 bg-red-400/15 text-red-100'],
};

function api(path, options = {}) {
  const baseUrl = import.meta.env.VITE_API_URL;
  if (!baseUrl) return Promise.reject(new Error('VITE_API_URL fehlt.'));
  return fetch(`${baseUrl}/api/qlik${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token') || ''}`,
      ...(options.headers || {}),
    },
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Qlik-Anfrage fehlgeschlagen.');
    return payload;
  });
}

function formatDate(value) {
  if (!value) return '–';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '–';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(date);
  } catch {
    return '–';
  }
}

class QlikExportBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Qlik-Statusmonitor konnte nicht dargestellt werden:', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="mb-3 rounded-xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-xs font-bold text-amber-100">
          Qlik-Statusmonitor vorübergehend nicht verfügbar. Alex 2 kann normal weiterverwendet werden.
        </div>
      );
    }
    return this.props.children;
  }
}

function QlikExportControlPanel() {
  const [data, setData] = useState({ job: null, lastImport: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const payload = await api('/export-status');
      setData({ job: payload.job || null, lastImport: payload.lastImport || null });
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Status nicht erreichbar.');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const delay = ACTIVE.has(data.job?.status) ? 3000 : 30000;
    const timer = window.setInterval(refresh, delay);
    return () => window.clearInterval(timer);
  }, [data.job?.status, refresh]);

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = await api('/export-jobs', { method: 'POST', body: '{}' });
      setData((current) => ({ ...current, job: payload.job }));
    } catch (requestError) {
      setError(requestError.message || 'Qlik-Lauf konnte nicht gestartet werden.');
    } finally {
      setBusy(false);
    }
  };

  const active = ACTIVE.has(data.job?.status);
  const presentation = STATUS[data.job?.status] || ['Bereit', 'border-white/20 bg-white/10 text-white/80'];
  let detail = 'Noch kein Importstatus vorhanden.';
  if (data.job?.status === 'FAILED') detail = data.job.message || 'Der letzte Lauf ist fehlgeschlagen.';
  else if (data.job) detail = `${formatDate(data.job.reportDate)} · ${data.job.message || presentation[0]}`;
  else if (data.lastImport) detail = `Letzter Import: ${formatDate(data.lastImport.reportDate)}`;

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Qlik Export &amp; Import</span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${presentation[1]}`}>{presentation[0]}</span>
        </div>
        <div className="mt-1 truncate text-xs font-semibold text-white/70">{error || detail}</div>
        {data.lastImport ? <div className="mt-0.5 text-[11px] text-white/40">Datenstand: {formatDate(data.lastImport.reportDate)}</div> : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={refresh} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-black hover:bg-white/15">Status aktualisieren</button>
        <button type="button" onClick={start} disabled={busy || active} className="rounded-lg bg-white px-4 py-2 text-xs font-black text-[#720000] disabled:cursor-not-allowed disabled:opacity-50">
          {active ? 'Lauf aktiv' : busy ? 'Wird angefordert…' : 'Qlik jetzt starten'}
        </button>
      </div>
    </div>
  );
}

export default function QlikExportControl() {
  return <QlikExportBoundary><QlikExportControlPanel /></QlikExportBoundary>;
}
