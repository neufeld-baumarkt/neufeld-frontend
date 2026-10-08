import React, { useEffect, useState } from 'react';

const emptyArticle = {
  ean: '', kunden_art_nr: '', supplier_article_no: '', name: '',
  ve_stueck: '', ek_einzel: '', ek_pro_karton: '', sort_index: '',
};

const fieldClass = 'h-11 w-full rounded-lg border border-black/20 bg-white px-3 text-black outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/15';

export default function MellerudArtikelMasterFormModal({ article, saving, onClose, onSave }) {
  const [form, setForm] = useState(emptyArticle);
  const isNew = !article;

  useEffect(() => {
    setForm(article ? {
      ean: article.ean || '',
      kunden_art_nr: article.kunden_art_nr || '',
      supplier_article_no: article.supplier_article_no || '',
      name: article.name || '',
      ve_stueck: String(article.ve_stueck ?? ''),
      ek_einzel: String(article.ek_einzel ?? ''),
      ek_pro_karton: String(article.ek_pro_karton ?? ''),
      sort_index: String(article.sort_index ?? ''),
    } : emptyArticle);
  }, [article]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, saving]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      ve_stueck: Number(form.ve_stueck),
      ek_einzel: Number(form.ek_einzel),
      ek_pro_karton: Number(form.ek_pro_karton),
      sort_index: form.sort_index === '' ? null : Number(form.sort_index),
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="article-master-form-title">
      <form onSubmit={submit} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white text-black shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-black/10 bg-white px-4 py-4 sm:px-6">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-black/45">Mellerud-Artikelstamm</div>
          <h2 id="article-master-form-title" className="mt-1 text-xl font-black sm:text-2xl">{isNew ? 'Artikel neu anlegen' : 'Artikel bearbeiten'}</h2>
        </header>

        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
          <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-bold">Artikelbezeichnung</span><input className={fieldClass} value={form.name} onChange={update('name')} required maxLength={250} autoFocus /></label>
          <label className="block"><span className="mb-1 block text-sm font-bold">EAN</span><input className={fieldClass} value={form.ean} onChange={update('ean')} required inputMode="numeric" pattern="[0-9]{8,14}" maxLength={14} /></label>
          <label className="block"><span className="mb-1 block text-sm font-bold">Neufeld-Art.-Nr.</span><input className={fieldClass} value={form.kunden_art_nr} onChange={update('kunden_art_nr')} required maxLength={100} /></label>
          <label className="block"><span className="mb-1 block text-sm font-bold">Mellerud-Art.-Nr.</span><input className={fieldClass} value={form.supplier_article_no} onChange={update('supplier_article_no')} required maxLength={100} /></label>
          <label className="block"><span className="mb-1 block text-sm font-bold">VE-Größe (Stück)</span><input className={fieldClass} type="number" min="1" step="1" value={form.ve_stueck} onChange={update('ve_stueck')} required /></label>
          <label className="block"><span className="mb-1 block text-sm font-bold">EK pro Stück netto</span><input className={fieldClass} type="number" min="0.0001" step="0.0001" value={form.ek_einzel} onChange={update('ek_einzel')} required inputMode="decimal" /></label>
          <label className="block"><span className="mb-1 block text-sm font-bold">EK pro VE netto</span><input className={fieldClass} type="number" min="0.01" step="0.01" value={form.ek_pro_karton} onChange={update('ek_pro_karton')} required inputMode="decimal" /></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-bold">Sortierung</span><input className={fieldClass} type="number" min="0" step="1" value={form.sort_index} onChange={update('sort_index')} placeholder={isNew ? 'Automatisch, wenn leer' : ''} /><span className="mt-1 block text-xs text-black/50">Kleinere Werte erscheinen im Bestellmodal weiter oben.</span></label>
          {!isNew && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">Eine EK-Änderung wird ab heute als neuer Preisstand gespeichert. Historische Bestellungen bleiben unverändert.</p>}
        </div>

        <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-black/10 bg-white p-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-lg border border-black/15 px-5 font-semibold disabled:opacity-50">Abbrechen</button>
          <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-[#800000] px-5 font-bold text-white disabled:opacity-50">{saving ? 'Speichert…' : isNew ? 'Artikel anlegen' : 'Änderungen speichern'}</button>
        </footer>
      </form>
    </div>
  );
}
