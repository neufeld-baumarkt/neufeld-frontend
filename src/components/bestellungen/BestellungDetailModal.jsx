import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const money = (value) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(number)
    : '—';
};

const date = (value) => value
  ? new Intl.DateTimeFormat('de-DE').format(new Date(String(value).slice(0, 10) + 'T12:00:00'))
  : '—';

const dispatchLabel = {
  pending: 'Versand ausstehend',
  sent: 'Versendet',
  failed: 'Versand fehlgeschlagen',
  blocked: 'Versand blockiert',
};

export default function BestellungDetailModal({ orderId, onClose, onChanged }) {
  const [order, setOrder] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const baseUrl = import.meta.env.VITE_API_URL;
  const token = sessionStorage.getItem('token');

  const load = async () => {
    if (!orderId || !token) return;
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/api/bestellungen/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrder(response.data.order);
      setPermissions(response.data.permissions || {});
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Bestellung konnte nicht geladen werden.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [orderId]);
  useEffect(() => {
    if (!orderId) return undefined;
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [orderId, onClose]);

  const splitRows = useMemo(() => {
    const articles = order?.split_snapshot?.artikel || {};
    return Object.entries(articles).flatMap(([articleId, block]) =>
      (block?.zeilen || []).map((row) => ({ articleId, ...row }))
    );
  }, [order]);

  if (!orderId) return null;

  const downloadPdf = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/bestellungen/${orderId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }, responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Bestellung_${orderId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'PDF konnte nicht erzeugt werden.');
    }
  };

  const resend = async () => {
    try {
      setResending(true);
      const response = await axios.post(`${baseUrl}/api/bestellungen/${orderId}/resend`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(response.data.message || 'Versand wurde erneut angestoßen.');
      await load();
      await onChanged?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Versand konnte nicht wiederholt werden.');
      await load();
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 p-3 sm:p-6 flex items-center justify-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <section className="w-full max-w-6xl max-h-[94vh] overflow-auto rounded-2xl bg-white text-black shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
        <header className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 border-b bg-white px-4 py-4 sm:px-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.2em] text-black/45">Unveränderlicher Bestellnachweis</div>
            <h2 id="order-detail-title" className="mt-1 text-2xl font-black">Bestellung {orderId.slice(0, 8)}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {permissions.canDownloadPdf && <button type="button" onClick={downloadPdf} className="rounded-lg border px-4 py-2 font-semibold hover:bg-black/5">PDF-Kopie</button>}
            {permissions.canResend && <button type="button" onClick={resend} disabled={resending} className="rounded-lg bg-[#800000] px-4 py-2 font-semibold text-white disabled:opacity-50">{resending ? 'Versendet…' : 'Erneut versenden'}</button>}
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 font-semibold hover:bg-black/5">Schließen</button>
          </div>
        </header>

        {loading || !order ? <div className="p-10 text-center text-black/55">Bestellung wird geladen…</div> : (
          <div className="space-y-6 p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Lieferant', order.supplier?.name], ['Bestellende Filiale', order.filiale],
                ['Bestelldatum', date(order.bestelldatum)], ['Bestellt von', order.ordered_by_name],
                ['Gesamt-VE', order.gesamt_ve], ['Gesamtsumme netto', money(order.gesamtsumme_netto)],
                ['Status', 'Read-only'], ['Versand', dispatchLabel[order.dispatch_status] || order.dispatch_status],
              ].map(([label, value]) => <div key={label} className="rounded-xl border bg-black/[.02] p-3"><div className="text-xs uppercase text-black/45">{label}</div><div className="mt-1 font-bold">{value || '—'}</div></div>)}
            </div>

            {order.dispatch_error && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Versandhinweis:</strong> {order.dispatch_error}</div>}

            <section>
              <h3 className="mb-3 text-lg font-black">Bestellte Positionen</h3>
              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-[850px] w-full text-sm">
                  <thead className="bg-black/[.04] text-left"><tr><th className="p-3">EAN</th><th className="p-3">Kunden-Art.-Nr.</th><th className="p-3">Artikel</th><th className="p-3 text-right">VE-Größe</th><th className="p-3 text-right">Bestellte VE</th><th className="p-3 text-right">VE-EK</th><th className="p-3 text-right">Summe</th></tr></thead>
                  <tbody>{order.positionen.map((position) => <tr key={position.id} className="border-t"><td className="p-3">{position.ean_snapshot || '—'}</td><td className="p-3">{position.kunden_art_nr_snapshot || '—'}</td><td className="p-3 font-semibold">{position.name_snapshot}</td><td className="p-3 text-right">{position.ve_stueck_snapshot}</td><td className="p-3 text-right font-bold">{position.menge_kartons}</td><td className="p-3 text-right">{money(position.ek_pro_karton_snapshot)}</td><td className="p-3 text-right font-bold">{money(position.positionssumme_netto)}</td></tr>)}</tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="mb-1 text-lg font-black">Interne Filialverteilung</h3>
              <p className="mb-3 text-sm text-black/55">Diese Angaben erscheinen niemals auf dem Lieferanten-PDF.</p>
              {splitRows.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-black/55">Keine interne Aufteilung – vollständige Belastung der bestellenden Filiale.</div> : (
                <div className="overflow-x-auto rounded-xl border"><table className="min-w-[720px] w-full text-sm"><thead className="bg-black/[.04] text-left"><tr><th className="p-3">Artikel</th><th className="p-3">Ziel-Filiale</th><th className="p-3">Einheit</th><th className="p-3 text-right">Menge</th><th className="p-3 text-right">Stück</th><th className="p-3 text-right">Budgetanteil</th></tr></thead><tbody>{splitRows.map((row, index) => <tr key={`${row.articleId}-${row.target_filiale}-${index}`} className="border-t"><td className="p-3">{order.positionen.find((position) => position.article_id === row.articleId)?.name_snapshot || row.articleId}</td><td className="p-3 font-semibold">{row.target_filiale}</td><td className="p-3">{row.einheit === 'karton' ? 'VE' : 'Stück'}</td><td className="p-3 text-right">{row.menge}</td><td className="p-3 text-right">{row.menge_stueck}</td><td className="p-3 text-right font-bold">{money(row.betrag_netto)}</td></tr>)}</tbody></table></div>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
