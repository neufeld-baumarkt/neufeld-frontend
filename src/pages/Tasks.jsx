import React, { useEffect, useMemo, useRef, useState } from 'react';

function getToken() {
  try {
    return sessionStorage.getItem('token') || '';
  } catch {
    return '';
  }
}

function getUser() {
  try {
    const raw = sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('de-DE');
}

function normalizeTasksPayload(payload) {
  // Erwartet laut Backend-Testvorgehen: { tasks: [...] }
  // Wir sind defensiv, aber ohne Fantasie-Felder.
  if (!payload) return { tasks: null, error: 'Leere Antwort vom Server.' };
  if (Array.isArray(payload.tasks)) return { tasks: payload.tasks, error: null };

  // Manche APIs liefern { data: { tasks: [...] } } – falls es so ist, fangen wir es ab.
  if (payload.data && Array.isArray(payload.data.tasks)) return { tasks: payload.data.tasks, error: null };

  return {
    tasks: null,
    error: 'Unerwartetes Antwortformat. Erwartet: { tasks: [...] }',
  };
}

export default function Tasks() {
  const baseUrl = import.meta.env.VITE_API_URL;
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getUser(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState([]);

  // Polling: konservativ (15s). Kann später pro Rolle/Seite angepasst werden.
  const [pollingEnabled] = useState(true);
  const pollingMs = 15000;

  const abortRef = useRef(null);

  async function fetchTasks() {
    setError('');

    if (!baseUrl) {
      setError('VITE_API_URL ist nicht gesetzt. Frontend kann Backend nicht erreichen.');
      return;
    }
    if (!token) {
      setError('Kein Token gefunden (sessionStorage.token). Bitte neu einloggen.');
      return;
    }

    // Abort laufender Request
    try {
      abortRef.current?.abort?.();
    } catch {
      // ignore
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: ctrl.signal,
      });

      const text = await res.text();
      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const msg = payload?.message || payload?.error || `HTTP ${res.status}`;
        setError(`Tasks laden fehlgeschlagen: ${msg}`);
        setTasks([]);
        return;
      }

      const norm = normalizeTasksPayload(payload);
      if (norm.error) {
        setError(norm.error);
        setTasks([]);
        return;
      }

      setTasks(norm.tasks);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      setError(`Tasks laden fehlgeschlagen: ${e?.message || String(e)}`);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();

    let t = null;
    if (pollingEnabled) {
      t = setInterval(() => {
        fetchTasks();
      }, pollingMs);
    }

    return () => {
      if (t) clearInterval(t);
      try {
        abortRef.current?.abort?.();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedTasks = useMemo(() => {
    // Keine Business-Logik – nur Anzeige-Sortierung:
    // Neueste oben nach last_event_at oder created_at.
    const copy = Array.isArray(tasks) ? [...tasks] : [];
    copy.sort((a, b) => {
      const ad = new Date(a?.last_event_at || a?.created_at || 0).getTime();
      const bd = new Date(b?.last_event_at || b?.created_at || 0).getTime();
      return bd - ad;
    });
    return copy;
  }, [tasks]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Tasks</h2>
        <div style={{ opacity: 0.8 }}>
          {user?.name ? `User: ${user.name}` : 'User: —'} {user?.role ? `(${user.role})` : ''}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" onClick={fetchTasks} disabled={loading}>
            {loading ? 'Lade…' : 'Neu laden'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, opacity: 0.75 }}>
        Endpoint: <code>/api/tasks</code> · Polling: {pollingEnabled ? `an (${pollingMs / 1000}s)` : 'aus'}
      </div>

      {error ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: '1px solid rgba(255,0,0,0.35)',
            background: 'rgba(255,0,0,0.06)',
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <div style={{ opacity: 0.85, marginBottom: 8 }}>
          Anzahl: <b>{sortedTasks.length}</b>
        </div>

        {sortedTasks.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.75 }}>Keine Tasks vorhanden.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {sortedTasks.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: 12,
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 700 }}>{t.title || '—'}</div>
                  <div style={{ opacity: 0.85 }}>
                    Status: <b>{t.status || '—'}</b>
                  </div>
                  <div style={{ opacity: 0.7 }}>
                    Letztes Event: <b>{t.last_event_type || '—'}</b> · {fmtDateTime(t.last_event_at)}
                  </div>
                </div>

                {t.body ? (
                  <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', opacity: 0.9 }}>{t.body}</div>
                ) : null}

                <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', opacity: 0.75 }}>
                  <div>Owner: {t.owner_type || '—'} / {t.owner_id ?? '—'}</div>
                  <div>Created: {fmtDateTime(t.created_at)}</div>
                  <div>Ack: {fmtDateTime(t.ack_at)}</div>
                  <div>Executed: {fmtDateTime(t.executed_at)}</div>
                  <div>Admin closed: {fmtDateTime(t.admin_closed_at)}</div>
                </div>

                {/* Schritt 1: read-only.
                    ACK/EXECUTE/PIN kommen erst in Schritt 2/3, damit wir produktiv nichts riskieren. */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
