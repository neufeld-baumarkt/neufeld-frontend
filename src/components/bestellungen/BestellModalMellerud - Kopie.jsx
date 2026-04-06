import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function BestellModalMellerud({ isOpen, lieferant, onClose }) {
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [articles, setArticles] = useState([]);
  const [mengen, setMengen] = useState({});

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
    setMengen({});
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

      return {
        ...article,
        mengeKartons,
        ekEinzel,
        ekProKarton,
        zeilensumme,
      };
    });
  }, [articles, mengen]);

  const gesamtsumme = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.zeilensumme, 0);
  }, [rows]);

  const totalKartons = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.mengeKartons, 0);
  }, [rows]);

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
                  className="shrink-0 px-4 py-2 rounded-lg border border-black/15 hover:bg-black/5 transition"
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
                        disabled={!isSuperUser}
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

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-3 text-[15px]">
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
          <div className="flex-1 overflow-auto bg-white">
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
                </tr>
              </thead>

              <tbody>
                {loadingArticles ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-black/60">
                      Lade Mellerud-Artikel...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-black/60">
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
                          className="w-[92px] h-[36px] rounded-md border border-black/20 px-2 text-right bg-white"
                        />
                      </td>
                      <td className="px-3 py-2 align-middle text-right whitespace-nowrap font-semibold">
                        {formatMoney(row.zeilensumme)}
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

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-sm text-black/60">Gesamt Kartons</div>
                    <div className="text-2xl font-bold">{totalKartons}</div>
                  </div>

                  <div className="text-right min-w-[220px]">
                    <div className="text-sm text-black/60">Gesamtsumme netto</div>
                    <div className="text-3xl font-extrabold">{formatMoney(gesamtsumme)}</div>
                  </div>
                </div>
              </div>

              {isSuperUser && !selectedFiliale && (
                <div className="mt-3 text-sm font-semibold text-red-700">
                  Bitte zuerst eine Filiale auswählen.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}