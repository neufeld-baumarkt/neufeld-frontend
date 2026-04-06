import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import SplitModal_Mellerud from './SplitModal_Mellerud';

export default function BestellModalMellerud({ isOpen, lieferant, onClose, onSaved }) {
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [articles, setArticles] = useState([]);
  const [mengen, setMengen] = useState({});
  const [splitDataByArticle, setSplitDataByArticle] = useState({});
  const [splitModalArticle, setSplitModalArticle] = useState(null);

  const [selectedFiliale, setSelectedFiliale] = useState('');
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

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

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
    setProfiles([]);
    setArticles([]);
    setSelectedFiliale('');
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
    if (!isOpen || lieferant?.code !== 'mellerud') return;

    loadProfiles();
    loadArticles();
    setMengen({});
    setSplitDataByArticle({});
    setSplitModalArticle(null);
  }, [isOpen, lieferant?.code]);

  const selectedProfile = useMemo(() => {
    return profiles.find((item) => item.filiale === selectedFiliale) || null;
  }, [profiles, selectedFiliale]);

  const handleMengeChange = (articleId, value) => {
    if (value === '') {
      setMengen((prev) => ({ ...prev, [articleId]: '' }));
      return;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      return;
    }

    setMengen((prev) => ({ ...prev, [articleId]: parsed }));
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
  const canSave = !isFormLocked && aktivePositionen.length > 0;

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
      },
      budget: {
        typ: 'bestellung',
        splits: [],
      },
    };

    try {
      setSaving(true);

      await axios.post(
        `${baseUrl}/api/bestellungen`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success('Bestellung erfolgreich gespeichert.');

      if (typeof onSaved === 'function') {
        onSaved();
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
    >
      <div
        className="w-full max-w-[1700px] h-[92vh] rounded-2xl border border-white/10 bg-white text-black shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full flex flex-col">
          {/* Kopf */}
          <div className="border-b border-black/15 bg-white shrink-0">
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="text-[32px] font-extrabold tracking-tight leading-none">
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
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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

                <div className={`mt-5 grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-3 text-[15px] ${isFilialeLocked ? 'opacity-50' : ''}`}>
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

          {/* Tabelle */}
          <div className={`flex-1 overflow-auto bg-white ${isFilialeLocked ? 'opacity-50 pointer-events-none select-none' : ''}`}>
            <table className="w-full border-collapse text-[14px]">
              <thead className="sticky top-0 z-10 bg-[#f4f4f4]">
                <tr className="border-b border-black">
                  <th className="text-left px-3 py-3 font-bold whitespace-nowrap">EAN-Nr.</th>
                  <th className="text-left px-3 py-3 font-bold whitespace-nowrap">Art.-Nr.</th>
                  <th className="text-left px-3 py-3 font-bold min-w-[420px]">Artikel-Bezeichnung</th>
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
                      className={`border-b border-black/10 ${index % 2 === 0 ? 'bg-white' : 'bg-black/[0.02]'}`}
                    >
                      <td className="px-3 py-2 align-middle whitespace-nowrap">{row.ean || '-'}</td>
                      <td className="px-3 py-2 align-middle whitespace-nowrap">{row.supplier_article_no || '-'}</td>
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
                          type="number"
                          min="0"
                          step="1"
                          value={mengen[row.id] ?? ''}
                          onChange={(e) => handleMengeChange(row.id, e.target.value)}
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
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
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
    </div>
  );
}