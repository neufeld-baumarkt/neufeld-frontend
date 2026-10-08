import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import MellerudArtikelMasterFormModal from './MellerudArtikelMasterFormModal';
import { mellerudArticleMasterMatchesSearch } from '../../lib/orderUi.mjs';

const money = (value, digits = 2) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(number) + ' €'
    : '—';
};

export default function MellerudArtikelManagerModal({ isOpen, onClose }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const baseUrl = import.meta.env.VITE_API_URL;

  const loadArticles = useCallback(async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return toast.error('Kein Zugriffstoken gefunden.');
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/api/bestellungen/artikelverwaltung`, { headers: { Authorization: `Bearer ${token}` } });
      setArticles(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch (error) {
      setArticles([]);
      toast.error(error?.response?.data?.message || 'Artikelstamm konnte nicht geladen werden.');
    } finally { setLoading(false); }
  }, [baseUrl]);

  useEffect(() => {
    if (!isOpen) return;
    setSearch(''); setStatusFilter('active'); setFormOpen(false); setSelectedArticle(null); loadArticles();
  }, [isOpen, loadArticles]);

  useEffect(() => {
    if (!isOpen || formOpen || saving) return undefined;
    const handleEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [formOpen, isOpen, onClose, saving]);

  const filteredArticles = useMemo(() => articles.filter((article) => {
    const statusMatches = statusFilter === 'all' || (statusFilter === 'active' && article.aktiv) || (statusFilter === 'inactive' && !article.aktiv);
    return statusMatches && mellerudArticleMasterMatchesSearch(article, search);
  }), [articles, search, statusFilter]);

  if (!isOpen) return null;
  const openCreate = () => { setSelectedArticle(null); setFormOpen(true); };
  const openEdit = (article) => { setSelectedArticle(article); setFormOpen(true); };

  const saveArticle = async (article) => {
    const token = sessionStorage.getItem('token');
    try {
      setSaving(true);
      const url = selectedArticle ? `${baseUrl}/api/bestellungen/artikelverwaltung/${encodeURIComponent(selectedArticle.id)}` : `${baseUrl}/api/bestellungen/artikelverwaltung`;
      await axios[selectedArticle ? 'patch' : 'post'](url, { article }, { headers: { Authorization: `Bearer ${token}` } });
      await loadArticles();
      toast.success(selectedArticle ? 'Artikel wurde aktualisiert.' : 'Artikel wurde angelegt.');
      setFormOpen(false); setSelectedArticle(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Artikel konnte nicht gespeichert werden.');
    } finally { setSaving(false); }
  };

  const toggleStatus = async (article) => {
    const nextActive = !article.aktiv;
    if (!nextActive && !window.confirm(`„${article.name}“ wirklich deaktivieren? Der Artikel verschwindet aus neuen Bestellungen, bleibt aber historisch erhalten.`)) return;
    const token = sessionStorage.getItem('token');
    try {
      setSaving(true);
      const response = await axios.patch(`${baseUrl}/api/bestellungen/artikelverwaltung/${encodeURIComponent(article.id)}/status`, { aktiv: nextActive }, { headers: { Authorization: `Bearer ${token}` } });
      setArticles((current) => current.map((item) => item.id === article.id ? response.data.item : item));
      toast.success(nextActive ? 'Artikel wurde reaktiviert.' : 'Artikel wurde deaktiviert.');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Artikelstatus konnte nicht geändert werden.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-2 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="article-manager-title">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[1550px] flex-col overflow-hidden rounded-xl bg-[#f5f5f3] text-black shadow-2xl sm:max-h-[94vh] sm:rounded-2xl">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 bg-white p-4 sm:p-6">
          <div><div className="text-xs font-bold uppercase tracking-[.2em] text-black/45">Mellerud</div><h2 id="article-manager-title" className="text-xl font-black sm:text-3xl">Artikelstamm verwalten</h2><p className="mt-1 text-sm text-black/55">{articles.filter((item) => item.aktiv).length} aktive · {articles.filter((item) => !item.aktiv).length} inaktive Artikel</p></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Artikelverwaltung schließen" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 text-2xl hover:bg-black/5 disabled:opacity-50">×</button>
        </header>

        <div className="flex flex-col gap-3 border-b border-black/10 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="EAN, Neufeld-Nr., Mellerud-Nr. oder Bezeichnung suchen…" className="h-11 min-w-0 flex-1 rounded-lg border border-black/20 px-3 outline-none focus:border-[#800000]" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-lg border border-black/20 bg-white px-3 font-semibold"><option value="active">Nur aktive</option><option value="inactive">Nur inaktive</option><option value="all">Alle Artikel</option></select>
          <button type="button" onClick={openCreate} className="min-h-11 rounded-lg bg-[#800000] px-5 font-bold text-white hover:bg-[#680000]">+ Artikel anlegen</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {loading ? <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-black/50">Artikelstamm wird geladen…</div> : filteredArticles.length === 0 ? <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-black/50">Keine passenden Artikel gefunden.</div> : <>
            <div className="hidden overflow-auto rounded-xl border border-black/10 bg-white md:block"><table className="w-full min-w-[1180px] text-sm"><thead className="sticky top-0 bg-[#292727] text-left text-white"><tr><th className="p-3">Status</th><th className="p-3">EAN</th><th className="p-3">Neufeld-Nr.</th><th className="p-3">Mellerud-Nr.</th><th className="p-3">Bezeichnung</th><th className="p-3 text-right">VE</th><th className="p-3 text-right">EK/Stück</th><th className="p-3 text-right">EK/VE</th><th className="p-3 text-right">Sort.</th><th className="p-3">Aktionen</th></tr></thead><tbody>{filteredArticles.map((article) => <tr key={article.id} className={`border-b border-black/10 ${article.aktiv ? '' : 'bg-black/[0.04] text-black/55'}`}><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${article.aktiv ? 'bg-emerald-100 text-emerald-800' : 'bg-black/10 text-black/60'}`}>{article.aktiv ? 'Aktiv' : 'Inaktiv'}</span></td><td className="p-3 whitespace-nowrap">{article.ean}</td><td className="p-3 whitespace-nowrap">{article.kunden_art_nr}</td><td className="p-3 whitespace-nowrap">{article.supplier_article_no}</td><td className="p-3 font-semibold">{article.name}</td><td className="p-3 text-right">{article.ve_stueck}</td><td className="p-3 text-right whitespace-nowrap">{money(article.ek_einzel, 4)}</td><td className="p-3 text-right whitespace-nowrap">{money(article.ek_pro_karton)}</td><td className="p-3 text-right">{article.sort_index}</td><td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => openEdit(article)} className="rounded-lg border border-black/15 px-3 py-2 font-semibold hover:bg-black/5">Bearbeiten</button><button type="button" onClick={() => toggleStatus(article)} disabled={saving} className={`rounded-lg px-3 py-2 font-semibold text-white disabled:opacity-50 ${article.aktiv ? 'bg-black/60' : 'bg-emerald-700'}`}>{article.aktiv ? 'Deaktivieren' : 'Reaktivieren'}</button></div></td></tr>)}</tbody></table></div>
            <div className="space-y-3 md:hidden">{filteredArticles.map((article) => <article key={article.id} className={`rounded-xl border border-black/10 bg-white p-4 ${article.aktiv ? '' : 'opacity-65'}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{article.name}</h3><p className="mt-1 text-xs text-black/55">EAN {article.ean}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${article.aktiv ? 'bg-emerald-100 text-emerald-800' : 'bg-black/10'}`}>{article.aktiv ? 'Aktiv' : 'Inaktiv'}</span></div><dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><div><dt className="text-xs text-black/45">Neufeld-Nr.</dt><dd className="font-semibold">{article.kunden_art_nr}</dd></div><div><dt className="text-xs text-black/45">Mellerud-Nr.</dt><dd className="font-semibold">{article.supplier_article_no}</dd></div><div><dt className="text-xs text-black/45">VE / Sortierung</dt><dd>{article.ve_stueck} / {article.sort_index}</dd></div><div><dt className="text-xs text-black/45">EK Stück / VE</dt><dd>{money(article.ek_einzel, 4)} / {money(article.ek_pro_karton)}</dd></div></dl><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => openEdit(article)} className="min-h-11 rounded-lg border border-black/15 font-semibold">Bearbeiten</button><button type="button" onClick={() => toggleStatus(article)} disabled={saving} className={`min-h-11 rounded-lg font-semibold text-white disabled:opacity-50 ${article.aktiv ? 'bg-black/60' : 'bg-emerald-700'}`}>{article.aktiv ? 'Deaktivieren' : 'Reaktivieren'}</button></div></article>)}</div>
          </>}
        </div>
      </div>
      {formOpen && <MellerudArtikelMasterFormModal article={selectedArticle} saving={saving} onClose={() => !saving && setFormOpen(false)} onSave={saveArticle} />}
    </div>
  );
}
