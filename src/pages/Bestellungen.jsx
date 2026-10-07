import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import BestellModalMellerud from '../components/bestellungen/BestellModalMellerud';
import BestellungDetailModal from '../components/bestellungen/BestellungDetailModal';
import { normalizeSupplierCode } from '../lib/orderUi.mjs';

const money = (value) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(number)
    : '—';
};

const date = (value) => value
  ? new Intl.DateTimeFormat('de-DE').format(new Date(String(value).slice(0, 10) + 'T12:00:00'))
  : '—';

const dispatchStyles = {
  sent: 'bg-emerald-500/20 text-emerald-200',
  failed: 'bg-red-500/20 text-red-200',
  blocked: 'bg-amber-500/20 text-amber-100',
  pending: 'bg-white/10 text-white/70',
};

const dispatchLabels = { sent: 'Versendet', failed: 'Versandfehler', blocked: 'Versand blockiert', pending: 'Ausstehend' };

export default function Bestellungen() {
  const navigate = useNavigate();
  const [lieferanten, setLieferanten] = useState([]);
  const [bestellungen, setBestellungen] = useState([]);
  const [loadingLieferanten, setLoadingLieferanten] = useState(false);
  const [loadingBestellungen, setLoadingBestellungen] = useState(false);
  const [selectedLieferant, setSelectedLieferant] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const baseUrl = import.meta.env.VITE_API_URL;

  let user = null;
  try { user = JSON.parse(sessionStorage.getItem('user')); } catch {}

  const token = sessionStorage.getItem('token');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchLieferanten = useCallback(async () => {
    if (!token) return toast.error('Kein Zugriffstoken gefunden.');
    try {
      setLoadingLieferanten(true);
      const response = await axios.get(`${baseUrl}/api/bestellungen/lieferanten`, { headers: authHeaders });
      setLieferanten(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch {
      setLieferanten([]);
      toast.error('Lieferanten konnten nicht geladen werden.');
    } finally {
      setLoadingLieferanten(false);
    }
  }, [baseUrl, token]);

  const fetchBestellungen = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingBestellungen(true);
      const response = await axios.get(`${baseUrl}/api/bestellungen`, { headers: authHeaders });
      setBestellungen(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch {
      setBestellungen([]);
      toast.error('Bestellungen konnten nicht geladen werden.');
    } finally {
      setLoadingBestellungen(false);
    }
  }, [baseUrl, token]);

  useEffect(() => { fetchLieferanten(); fetchBestellungen(); }, [fetchLieferanten, fetchBestellungen]);

  const logout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    navigate('/');
  };

  return (
    <main className="min-h-screen bg-[#3A3838] text-white">
      <header className="border-b-4 border-white bg-[#800000] shadow-lg">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.25em] text-white/60">Eigeneinkauf</div>
            <h1 className="text-2xl font-black sm:text-4xl">Bestellungen</h1>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-xl border border-white/20 bg-black/10 px-4 py-2 text-left">
              <span className="block text-xs text-white/60">Angemeldet als</span><strong>{user?.name || 'Unbekannt'}</strong>
            </button>
            {menuOpen && <div className="absolute right-0 top-full z-30 mt-2 min-w-44 rounded-xl bg-white p-2 text-black shadow-xl"><button type="button" onClick={logout} className="w-full rounded-lg px-3 py-2 text-left hover:bg-black/5">Abmelden</button></div>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-8">
        <button type="button" onClick={() => navigate('/start')} className="mb-6 inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 font-semibold hover:bg-white/10">← Zurück zum Hauptmenü</button>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="mb-3 text-lg font-black">Neue Bestellung</h2>
            {loadingLieferanten ? <div className="text-white/55">Lieferanten werden geladen…</div> : lieferanten.length === 0 ? <div className="text-white/55">Keine aktiven Lieferanten.</div> : (
              <div className="space-y-2">{lieferanten.map((lieferant) => {
                const implemented = lieferant.implemented || normalizeSupplierCode(lieferant.code) === 'mellerud';
                return <button key={lieferant.id} type="button" disabled={!implemented} onClick={() => implemented && setSelectedLieferant(lieferant)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-[#800000] disabled:cursor-not-allowed disabled:opacity-50"><strong className="block">{lieferant.name}</strong><span className="mt-1 block text-xs text-white/55">{implemented ? `Mindestens ${lieferant.minimum_order_ve || 2} VE` : 'Workflow noch nicht verfügbar'}</span></button>;
              })}</div>
            )}
          </aside>

          <section className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Gespeicherte Bestellungen</h2><p className="text-sm text-white/55">Verbindlich gespeichert und ausschließlich read-only.</p></div><button type="button" onClick={fetchBestellungen} disabled={loadingBestellungen} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50">Aktualisieren</button></div>
            {loadingBestellungen ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-white/55">Bestellungen werden geladen…</div> : bestellungen.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-white/55">Noch keine Bestellungen vorhanden.</div> : (
              <div className="grid gap-3 xl:grid-cols-2">{bestellungen.map((order) => <button key={order.id} type="button" onClick={() => setDetailOrderId(order.id)} className="rounded-xl border border-white/10 bg-black/10 p-4 text-left transition hover:border-white/30 hover:bg-black/20"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-lg font-black">{order.supplier?.name || 'Lieferant'}</div><div className="mt-1 text-sm text-white/60">{order.filiale} · {date(order.bestelldatum)} · {order.gesamt_ve || '—'} VE</div></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${dispatchStyles[order.dispatch_status] || dispatchStyles.pending}`}>{dispatchLabels[order.dispatch_status] || order.dispatch_status}</span></div><div className="mt-4 flex items-end justify-between"><span className="text-sm text-white/55">{order.position_count} Positionen</span><strong className="text-2xl">{money(order.gesamtsumme_netto)}</strong></div></button>)}</div>
            )}
          </section>
        </div>
      </div>

      <BestellModalMellerud isOpen={!!selectedLieferant && normalizeSupplierCode(selectedLieferant.code) === 'mellerud'} lieferant={selectedLieferant} onClose={() => setSelectedLieferant(null)} onSaved={fetchBestellungen} />
      <BestellungDetailModal orderId={detailOrderId} onClose={() => setDetailOrderId(null)} onChanged={fetchBestellungen} />
    </main>
  );
}
