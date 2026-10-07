import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function MellerudArtikelEditModal({ article, onClose, onSaved }) {
  const [supplierArticleNo, setSupplierArticleNo] = useState('');
  const [neufeldArticleNo, setNeufeldArticleNo] = useState('');
  const [saving, setSaving] = useState(false);
  const baseUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    setSupplierArticleNo(article?.supplier_article_no || '');
    setNeufeldArticleNo(article?.kunden_art_nr || '');
  }, [article]);

  useEffect(() => {
    if (!article || saving) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [article, onClose, saving]);

  if (!article) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error('Kein Zugriffstoken gefunden.');
      return;
    }

    try {
      setSaving(true);
      const response = await axios.patch(
        `${baseUrl}/api/bestellungen/artikel/${encodeURIComponent(article.id)}`,
        {
          article: {
            supplier_article_no: supplierArticleNo,
            kunden_art_nr: neufeldArticleNo,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Artikelnummern gespeichert.');
      onSaved(response.data.item);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Artikelnummern konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-labelledby="mellerud-article-edit-title">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 text-black shadow-2xl">
        <div className="mb-5">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-black/45">Mellerud-Artikelstamm</div>
          <h2 id="mellerud-article-edit-title" className="mt-1 text-2xl font-black">Artikelnummern bearbeiten</h2>
          <p className="mt-2 text-sm text-black/60">{article.name}</p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-bold">EAN</span>
            <input value={article.ean || ''} readOnly className="h-11 w-full rounded-lg border border-black/15 bg-black/5 px-3 text-black/60" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Neufeld-Art.-Nr.</span>
            <input value={neufeldArticleNo} onChange={(event) => setNeufeldArticleNo(event.target.value)} required maxLength={100} autoFocus className="h-11 w-full rounded-lg border border-black/20 px-3" />
            <span className="mt-1 block text-xs text-black/50">Erscheint im Bestellmodal und ist dort durchsuchbar.</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Mellerud-Art.-Nr.</span>
            <input value={supplierArticleNo} onChange={(event) => setSupplierArticleNo(event.target.value)} required maxLength={100} className="h-11 w-full rounded-lg border border-black/20 px-3" />
            <span className="mt-1 block text-xs text-black/50">Erscheint ausschließlich in der Lieferanten-PDF.</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-black/15 px-4 py-2 font-semibold disabled:opacity-50">Abbrechen</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-[#800000] px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Speichert…' : 'Speichern'}</button>
        </div>
      </form>
    </div>
  );
}
