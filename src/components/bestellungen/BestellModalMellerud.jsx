import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import SplitModal_Mellerud from './SplitModal_Mellerud';
import MellerudArtikelEditModal from './MellerudArtikelEditModal';
import {
  compactSplitPayload,
  dateInBerlin,
  mellerudArticleMatchesSearch,
  normalizeSupplierCode,
  orderMeetsMinimumVe,
} from '../../lib/orderUi.mjs';

function normalizeFiliale(value) {
  const t = String(value || '').trim();
  return t ? t : '';
}

export default function BestellModalMellerud({ isOpen, lieferant, onClose, onSaved }) {
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [articles, setArticles] = useState([]);
  const [mengen, setMengen] = useState({});
  const [splitDataByArticle, setSplitDataByArticle] = useState({});
  const [splitModalArticle, setSplitModalArticle] = useState(null);
  const [editModalArticle, setEditModalArticle] = useState(null);

  const [selectedFiliale, setSelectedFiliale] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [highlightedArticleId, setHighlightedArticleId] = useState(null);

  const searchInputRef = useRef(null);
  const tableScrollRef = useRef(null);
  const rowRefs = useRef({});
  const mengeInputRefs = useRef({});
  const highlightTimeoutRef = useRef(null);

  const baseUrl = import.meta.env.VITE_API_URL;

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem('user'));
  } catch {}

  const userRole = user?.role || '';
  const userFiliale = user?.filiale || '';

  const isSuperUser =
    !userFiliale ||
    userFiliale.trim() === '' ||
    userFiliale.trim() === '-' ||
    userFiliale.toLowerCase().trim() === 'alle' ||
    ['supervisor', 'manager', 'admin', 'geschäftsführer', 'manager-1'].includes(userRole.toLowerCase());
  const canEditArticleMaster = ['supervisor', 'admin', 'geschäftsführer', 'manager-1']
    .includes(userRole.toLowerCase());

  const todayIso = useMemo(() => dateInBerlin(), []);
  const minimumOrderVe = Number(lieferant?.minimum_order_ve) || 2;

  const getToken = () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error('Kein Zugriffstoken gefunden.');
      return null;
    }
    return token;
  };

  const closeAndReset = () => {
    if (saving) return;
    setMengen({});
    setSplitDataByArticle({});
    setSplitModalArticle(null);
    setEditModalArticle(null);
    setProfiles([]);
    setArticles([]);
    setSelectedFiliale('');
    setSearchTerm('');
    setSearchOpen(false);
    setActiveSearchIndex(0);
    setHighlightedArticleId(null);
    onClose();
  };

  const loadProfiles = async () => {
    const token = getToken();
    if (!token || !lieferant?.code) return;

    try {
      setLoadingProfiles(true);

      const res = await axios.get(
        `${baseUrl}/api/bestellungen/filialprofil?supplier=${encodeURIComponent(lieferant.code)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      setProfiles(items);

      if (isSuperUser) {
        setSelectedFiliale('');
      } else {
        const ownProfile = items.find((item) => item.filiale === userFiliale);
        setSelectedFiliale(ownProfile?.filiale || userFiliale || '');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Filialprofile:', err);
      toast.error('Filialprofile konnten nicht geladen werden.');
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const loadArticles = async () => {
    const token = getToken();
    if (!token || !lieferant?.code) return;

    try {
      setLoadingArticles(true);

      const res = await axios.get(
        `${baseUrl}/api/bestellungen/artikel-mit-ek?supplier=${encodeURIComponent(lieferant.code)}&datum=${todayIso}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      setArticles(items);
    } catch (err) {
      console.error('Fehler beim Laden der Artikel:', err);
      toast.error('Artikel konnten nicht geladen werden.');
      setArticles([]);
    } finally {
      setLoadingArticles(false);
    }
  };

  useEffect(() => {
    if (!isOpen || normalizeSupplierCode(lieferant?.code) !== 'mellerud') return;

    loadProfiles();
    loadArticles();
    setMengen({});
    setSplitDataByArticle({});
    setSplitModalArticle(null);
    setEditModalArticle(null);
    setSearchTerm('');
    setSearchOpen(false);
    setActiveSearchIndex(0);
    setHighlightedArticleId(null);
  }, [isOpen, lieferant?.code]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !splitModalArticle && !editModalArticle && !saving) closeAndReset();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, splitModalArticle, editModalArticle, saving]);

  const selectedProfile = useMemo(() => {
    return profiles.find((item) => item.filiale === selectedFiliale) || null;
  }, [profiles, selectedFiliale]);

  const handleMengeChange = (articleId, value) => {
    if (value === '') {
      setMengen((prev) => ({ ...prev, [articleId]: '' }));
      setSplitDataByArticle((prev) => {
        if (!prev[articleId]) return prev;
        const next = { ...prev };
        delete next[articleId];
        return next;
      });
      return;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      return;
    }

    setMengen((prev) => ({ ...prev, [articleId]: parsed }));
    setSplitDataByArticle((prev) => {
      if (!prev[articleId]) return prev;
      const next = { ...prev };
      delete next[articleId];
      return next;
    });
  };

  const handleOpenSplitModal = (row) => {
    if (isFormLocked) return;
    if (!Number.isInteger(row.mengeKartons) || row.mengeKartons <= 0) {
      toast.error('Bitte zuerst eine Kartonmenge > 0 erfassen.');
      return;
    }
    setSplitModalArticle(row);
  };

  const handleSaveSplitForArticle = (articleId, splitBlock) => {
    if (!articleId) return;

    if (!splitBlock || !Array.isArray(splitBlock.zeilen) || splitBlock.zeilen.length === 0) {
      setSplitDataByArticle((prev) => {
        const next = { ...prev };
        delete next[articleId];
        return next;
      });
      return;
    }

    setSplitDataByArticle((prev) => ({
      ...prev,
      [articleId]: splitBlock,
    }));
  };

  const formatMoney = (value) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return '-';
    return `${numberValue.toFixed(2)} €`;
  };

  const rows = useMemo(() => {
    return articles.map((article) => {
      const mengeKartons = Number.isInteger(mengen[article.id]) ? mengen[article.id] : 0;
      const ekEinzel = article.ek_einzel !== null && article.ek_einzel !== undefined
        ? Number(article.ek_einzel)
        : null;
      const ekProKarton = article.ek_pro_karton !== null && article.ek_pro_karton !== undefined
        ? Number(article.ek_pro_karton)
        : null;

      const zeilensumme =
        Number.isFinite(ekProKarton) && Number.isInteger(mengeKartons)
          ? ekProKarton * mengeKartons
          : 0;

      const splitBlock = splitDataByArticle[article.id] || null;
      const hasActiveSplit =
        !!splitBlock &&
        splitBlock.active === true &&
        Array.isArray(splitBlock.zeilen) &&
        splitBlock.zeilen.length > 0;

      return {
        ...article,
        mengeKartons,
        ekEinzel,
        ekProKarton,
        zeilensumme,
        splitBlock,
        hasActiveSplit,
      };
    });
  }, [articles, mengen, splitDataByArticle]);

  const searchResults = useMemo(() => {
    return rows
      .filter((row) => mellerudArticleMatchesSearch(row, searchTerm))
      .slice(0, 12);
  }, [rows, searchTerm]);

  const handleArticleUpdated = (updatedArticle) => {
    setArticles((current) => current.map((article) => (
      article.id === updatedArticle.id ? { ...article, ...updatedArticle } : article
    )));
    setEditModalArticle(null);
  };

  const gesamtsumme = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.zeilensumme, 0);
  }, [rows]);

  const totalKartons = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.mengeKartons, 0);
  }, [rows]);

  const aktivePositionen = useMemo(() => {
    return rows
      .filter((row) => Number.isInteger(row.mengeKartons) && row.mengeKartons > 0)
      .map((row) => ({
        articleId: row.id,
        menge_kartons: row.mengeKartons,
      }));
  }, [rows]);

  const requiresFilialeSelection = isSuperUser;
  const isFilialeLocked = requiresFilialeSelection && !selectedFiliale;
  const isFormLocked = loadingProfiles || loadingArticles || saving || isFilialeLocked;
  const meetsMinimumVe = orderMeetsMinimumVe(totalKartons, minimumOrderVe);
  const canSave = !isFormLocked && aktivePositionen.length > 0 && meetsMinimumVe;

  const focusArticleMenge = (articleId) => {
    window.setTimeout(() => {
      const input = mengeInputRefs.current[articleId];
      if (input) {
        input.focus();
        input.select();
      }
    }, 120);
  };

  const selectSearchResult = (row) => {
    if (!row?.id) return;

    setSearchTerm('');
    setSearchOpen(false);
    setActiveSearchIndex(0);
    setHighlightedArticleId(row.id);

    const rowElement = rowRefs.current[row.id];
    if (rowElement) {
      rowElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }

    focusArticleMenge(row.id);

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedArticleId(null);
    }, 1800);
  };

  const handleSearchKeyDown = (e) => {
    if (isFormLocked) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length === 0) return;
      setSearchOpen(true);
      setActiveSearchIndex((prev) => (prev + 1 >= searchResults.length ? 0 : prev + 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length === 0) return;
      setSearchOpen(true);
      setActiveSearchIndex((prev) => (prev - 1 < 0 ? searchResults.length - 1 : prev - 1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length === 0) return;
      const selected = searchResults[activeSearchIndex] || searchResults[0];
      selectSearchResult(selected);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setSearchOpen(false);
    }
  };

  const handleMengeKeyDown = (e) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    window.setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }, 0);
  };

  const handleSave = async () => {
    if (saving) return;

    const token = getToken();
    if (!token) return;

    if (requiresFilialeSelection && !selectedFiliale) {
      toast.error('Bitte zuerst eine Filiale auswählen.');
      return;
    }

    if (aktivePositionen.length === 0) {
      toast.error('Bitte mindestens einen Artikel mit Kartonmenge > 0 erfassen.');
      return;
    }

    const payload = {
      order: {
        supplier: lieferant?.code,
        filiale: selectedFiliale,
        bestelldatum: todayIso,
        status: 'saved',
        positionen: aktivePositionen,
        split_details: compactSplitPayload(splitDataByArticle),
      },
    };

    try {
      setSaving(true);

      const response = await axios.post(
        `${baseUrl}/api/bestellungen`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success('Bestellung verbindlich und read-only gespeichert.');
      if (response?.data?.delivery?.status && response.data.delivery.status !== 'sent') {
        toast.error(`Versandstatus: ${response.data.delivery.message || response.data.delivery.status}`);
      }

      if (typeof onSaved === 'function') {
        await onSaved();
      }

      closeAndReset();
    } catch (err) {
      console.error('Fehler beim Speichern der Bestellung:', err);
      const message =
        err?.response?.data?.message ||
        'Bestellung konnte nicht gespeichert werden.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6 py-6"
      onClick={closeAndReset}
      role="presentation"
    >
      <div
        className="w-full max-w-[1700px] max-h-[94vh] sm:max-h-[92vh] rounded-xl sm:rounded-2xl border border-white/10 bg-white text-black shadow-2xl overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mellerud-order-title"
      >
        <div className="min-h-full flex flex-col">
          {/* Kopf */}
          <div className="border-b border-black/15 bg-white shrink-0">
            <div className="px-6 pt-5 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-6">
                <div className="min-w-0">
                  <div id="mellerud-order-title" className="text-2xl sm:text-[32px] font-extrabold tracking-tight leading-none">
                    MELLERUD
                  </div>
                  <div className="text-sm mt-1">
                    CHEMIE GMBH
                  </div>
                  <div className="text-sm mt-3 leading-6 text-black/80">
                    Bernhard-Röttgen-Waldweg 20 · 41379 Brüggen · Tel. 02163 / 950900 · Fax 02163 / 95090120
                    <br />
                    E-Mail: innendienst@mellerud.de · Internet: www.mellerud.de
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm text-black/60">Stand EK-Datum</div>
                  <div className="text-lg font-semibold">{todayIso}</div>
                  <div className="text-sm text-black/60 mt-4">Formular</div>
                  <div className="text-lg font-semibold">Auftragsformular Classic</div>
                </div>

                <button
                  type="button"
                  onClick={closeAndReset}
                  disabled={saving}
                  className="shrink-0 px-4 py-2 rounded-lg border border-black/15 hover:bg-black/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Schließen
                </button>
              </div>

              <div className="mt-5 border-t border-black pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Filiale</label>

                    {loadingProfiles ? (
                      <div className="h-[42px] rounded-lg border border-black/15 px-3 flex items-center text-black/60">
                        Lade Filialprofile...
                      </div>
                    ) : (
                      <select
                        value={selectedFiliale}
                        onChange={(e) => setSelectedFiliale(e.target.value)}
                        disabled={!isSuperUser || saving}
                        className="w-full h-[42px] rounded-lg border border-black/20 px-3 bg-white disabled:bg-black/5"
                      >
                        {isSuperUser && <option value="">Bitte Filiale auswählen</option>}
                        {profiles.map((profile) => (
                          <option key={profile.filiale} value={profile.filiale}>
                            {profile.filiale}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Lieferant</label>
                    <div className="h-[42px] rounded-lg border border-black/15 px-3 flex items-center bg-black/[0.03]">
                      {lieferant?.name || 'Mellerud'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Bestelldatum</label>
                    <div className="h-[42px] rounded-lg border border-black/15 px-3 flex items-center bg-black/[0.03]">
                      {todayIso}
                    </div>
                  </div>
                </div>

                <div className={`mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[15px] ${isFilialeLocked ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-[130px] font-semibold">Firma:</div>
                    <div className="flex-1 min-h-[34px] border-b border-black/40 flex items-end pb-1">
                      {selectedProfile?.firma || ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-[130px] font-semibold">Kunden-Nr.:</div>
                    <div className="flex-1 min-h-[34px] border-b border-black/40 flex items-end pb-1">
                      {selectedProfile?.kunden_nr || ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-[130px] font-semibold">Straße:</div>
                    <div className="flex-1 min-h-[34px] border-b border-black/40 flex items-end pb-1">
                      {selectedProfile?.strasse || ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-[130px] font-semibold">Auftrags-Nr.:</div>
                    <div className="flex-1 min-h-[34px] border-b border-black/40 flex items-end pb-1">
                      {selectedProfile?.auftrags_nr || ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-[130px] font-semibold">Ort:</div>
                    <div className="flex-1 min-h-[34px] border-b border-black/40 flex items-end pb-1">
                      {selectedProfile?.ort || ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-[130px] font-semibold">Gesprächspartner:</div>
                    <div className="flex-1 min-h-[34px] border-b border-black/40 flex items-end pb-1">
                      {selectedProfile?.gespraechspartner || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Suche */}
          <div className={`shrink-0 border-b border-black/15 bg-white px-6 py-4 ${isFilialeLocked ? 'opacity-50 pointer-events-none select-none' : ''}`}>
            <div className="relative max-w-[760px]">
              <label className="block text-sm font-semibold mb-2">Artikelsuche</label>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchOpen(true);
                  setActiveSearchIndex(0);
                }}
                onFocus={() => {
                  if (searchTerm.trim()) {
                    setSearchOpen(true);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                disabled={isFormLocked}
                placeholder="Artikelbezeichnung, EAN oder Neufeld-Art.-Nr. suchen..."
                className="w-full h-[42px] rounded-lg border border-black/20 px-3 bg-white disabled:bg-black/5 disabled:text-black/50"
              />

              {searchOpen && searchTerm.trim() && !isFormLocked && (
                <div className="absolute left-0 right-0 top-[72px] z-30 rounded-lg border border-black/20 bg-white shadow-xl overflow-hidden">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-black/60">
                      Keine Treffer gefunden.
                    </div>
                  ) : (
                    <div className="max-h-[360px] overflow-auto">
                      {searchResults.map((row, index) => (
                        <button
                          key={row.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectSearchResult(row);
                          }}
                          className={[
                            'w-full text-left px-4 py-3 border-b border-black/10 last:border-b-0',
                            index === activeSearchIndex ? 'bg-[#fff1cc]' : 'bg-white hover:bg-black/[0.04]',
                          ].join(' ')}
                        >
                          <div className="font-semibold text-[14px] leading-5">
                            {row.name || '-'}
                          </div>
                          <div className="mt-1 text-xs text-black/60 flex flex-wrap gap-x-4 gap-y-1">
                            <span>Neufeld-Art.-Nr.: {row.kunden_art_nr || '-'}</span>
                            <span>EAN: {row.ean || '-'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tabelle */}
          <div
            ref={tableScrollRef}
            className={`w-full min-w-0 min-h-[260px] max-h-[50vh] overflow-auto bg-white ${isFilialeLocked ? 'opacity-50 pointer-events-none select-none' : ''}`}
          >
            <table className="w-full border-collapse text-[14px]">
              <thead className="sticky top-0 z-10 bg-[#f4f4f4]">
                <tr className="border-b border-black">
                  <th className="text-left px-3 py-3 font-bold whitespace-nowrap">EAN-Nr.</th>
                  <th className="text-left px-3 py-3 font-bold whitespace-nowrap">Neufeld-Art.-Nr.</th>
                  <th className="text-left px-3 py-3 font-bold min-w-[300px] sm:min-w-[420px]">Artikel-Bezeichnung</th>
                  <th className="text-right px-3 py-3 font-bold whitespace-nowrap">VE / Stück</th>
                  <th className="text-right px-3 py-3 font-bold whitespace-nowrap">Einzel-EK</th>
                  <th className="text-right px-3 py-3 font-bold whitespace-nowrap">VE-EK</th>
                  <th className="text-right px-3 py-3 font-bold whitespace-nowrap">Kartons</th>
                  <th className="text-right px-3 py-3 font-bold whitespace-nowrap">Zeilensumme</th>
                  <th className="text-center px-3 py-3 font-bold whitespace-nowrap">Split</th>
                </tr>
              </thead>

              <tbody>
                {loadingArticles ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-black/60">
                      Lade Mellerud-Artikel...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-black/60">
                      Keine Artikel vorhanden.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={row.id}
                      ref={(el) => {
                        if (el) rowRefs.current[row.id] = el;
                      }}
                      className={[
                        'border-b border-black/10 transition-colors duration-300',
                        highlightedArticleId === row.id
                          ? 'bg-[#fff1cc]'
                          : index % 2 === 0
                          ? 'bg-white'
                          : 'bg-black/[0.02]',
                      ].join(' ')}
                    >
                      <td className="px-3 py-2 align-middle whitespace-nowrap">{row.ean || '-'}</td>
                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        <div>{row.kunden_art_nr || '-'}</div>
                        {canEditArticleMaster && (
                          <button
                            type="button"
                            onClick={() => setEditModalArticle(row)}
                            disabled={isFormLocked}
                            className="mt-1 text-xs font-semibold text-[#800000] underline underline-offset-2 disabled:opacity-40"
                          >
                            Artikelnummern bearbeiten
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle">{row.name || '-'}</td>
                      <td className="px-3 py-2 align-middle text-right whitespace-nowrap">{row.ve_stueck ?? '-'}</td>
                      <td className="px-3 py-2 align-middle text-right whitespace-nowrap">
                        {row.ekEinzel !== null ? formatMoney(row.ekEinzel) : '-'}
                      </td>
                      <td className="px-3 py-2 align-middle text-right whitespace-nowrap">
                        {row.ekProKarton !== null ? formatMoney(row.ekProKarton) : '-'}
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        <input
                          ref={(el) => {
                            if (el) mengeInputRefs.current[row.id] = el;
                          }}
                          type="number"
                          min="0"
                          step="1"
                          value={mengen[row.id] ?? ''}
                          onChange={(e) => handleMengeChange(row.id, e.target.value)}
                          onKeyDown={handleMengeKeyDown}
                          disabled={isFormLocked}
                          className="w-[92px] h-[36px] rounded-md border border-black/20 px-2 text-right bg-white disabled:bg-black/5 disabled:text-black/50"
                        />
                      </td>
                      <td className="px-3 py-2 align-middle text-right whitespace-nowrap font-semibold">
                        {formatMoney(row.zeilensumme)}
                      </td>
                      <td className="px-3 py-2 align-middle text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenSplitModal(row)}
                          disabled={isFormLocked || row.mengeKartons <= 0}
                          className={[
                            'relative inline-flex h-[28px] w-[54px] items-center rounded-full transition-colors',
                            row.hasActiveSplit ? 'bg-green-500' : 'bg-black/15',
                            (isFormLocked || row.mengeKartons <= 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          ].join(' ')}
                          title={
                            row.mengeKartons <= 0
                              ? 'Bitte zuerst Kartonmenge > 0 erfassen'
                              : row.hasActiveSplit
                              ? 'Split bearbeiten'
                              : 'Split anlegen'
                          }
                        >
                          <span
                            className={[
                              'inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow transition-transform',
                              row.hasActiveSplit ? 'translate-x-[28px]' : 'translate-x-[4px]'
                            ].join(' ')}
                          />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-black bg-white">
            <div className="px-6 py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-sm text-black/70">
                  Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.
                </div>

                <div className="flex items-center gap-4 xl:gap-8">
                  <div className="text-right">
                    <div className="text-sm text-black/60">Gesamt Kartons</div>
                    <div className="text-2xl font-bold">{totalKartons}</div>
                  </div>

                  <div className="text-right min-w-[220px]">
                    <div className="text-sm text-black/60">Gesamtsumme netto</div>
                    <div className="text-3xl font-extrabold">{formatMoney(gesamtsumme)}</div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave}
                    className="h-[44px] px-5 rounded-lg bg-black text-white font-semibold hover:bg-black/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Speichert...' : 'Bestellung speichern'}
                  </button>
                </div>
              </div>

              {isSuperUser && !selectedFiliale && (
                <div className="mt-3 text-sm font-semibold text-red-700">
                  Bitte zuerst eine Filiale auswählen. Bis dahin bleibt die Bestellung gesperrt.
                </div>
              )}

              {!isFilialeLocked && !saving && aktivePositionen.length === 0 && (
                <div className="mt-3 text-sm font-semibold text-red-700">
                  Bitte mindestens einen Artikel mit Kartonmenge &gt; 0 erfassen.
                </div>
              )}
              {!isFilialeLocked && !saving && aktivePositionen.length > 0 && !meetsMinimumVe && (
                <div className="mt-3 text-sm font-semibold text-red-700">
                  Die gesamte Bestellung muss mindestens {minimumOrderVe} VE enthalten. Aktuell: {totalKartons} VE.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SplitModal_Mellerud
        isOpen={!!splitModalArticle}
        onClose={() => setSplitModalArticle(null)}
        onSave={(splitBlock) => {
          if (!splitModalArticle?.id) return;
          handleSaveSplitForArticle(splitModalArticle.id, splitBlock);
          setSplitModalArticle(null);
        }}
        article={splitModalArticle}
        sourceFiliale={selectedFiliale}
        bestellteKartons={splitModalArticle?.mengeKartons || 0}
        existingSplitData={splitModalArticle ? splitDataByArticle[splitModalArticle.id] || null : null}
        filialen={profiles.map((profile) => profile.filiale)}
      />

      <MellerudArtikelEditModal
        article={editModalArticle}
        onClose={() => setEditModalArticle(null)}
        onSaved={handleArticleUpdated}
      />
    </div>
  );
}
