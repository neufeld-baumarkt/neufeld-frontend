// src/pages/Reklamationen.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateReklamationModal from '../components/CreateReklamationModal';
import EditReklamationModal from '../components/EditReklamationModal';
import FilterModal from '../components/FilterModal';

const PAGE_SIZE = 10;

export default function Reklamationen() {
  const [reklas, setReklas] = useState([]);
  const [filteredReklas, setFilteredReklas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeReklaId, setActiveReklaId] = useState(null);
  const [reklaDetails, setReklaDetails] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // ✅ Notiz-State
  const [showNotiz, setShowNotiz] = useState(false);
  const [notizDraft, setNotizDraft] = useState('');
  const [notizSaving, setNotizSaving] = useState(false);

  const [filters, setFilters] = useState({
    filiale: 'Alle',
    status: 'Alle',
    reklaNr: '',
    sortDatum: 'desc'
  });

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("user"));
  } catch (e) {
    console.warn("Benutzer konnte nicht geladen werden:", e);
  }

  const displayName = user?.name || "Unbekannt";
  const rawFiliale = user?.filiale || "";
  const userRole = user?.role || "";
  const isSuperUser =
    !rawFiliale ||
    rawFiliale.trim() === "" ||
    rawFiliale.trim() === "-" ||
    rawFiliale.toLowerCase().trim() === "alle" ||
    ['supervisor', 'manager', 'admin'].includes(userRole.toLowerCase());

  const canEdit = userRole.toLowerCase() !== 'filiale';
  const canWriteNotiz = ['admin', 'supervisor'].includes(userRole.toLowerCase());

  const headlineText = isSuperUser
    ? "Reklamationsliste"
    : `Reklamationsliste – Filiale ${rawFiliale}`;

  // ---- lfd. Nr. Anzeige-Logik (Liste + Modal) ----
  // Erwartet: min_lfd_nr + position_count (kann String sein)
  const formatLfdDisplay = ({ min_lfd_nr, position_count }) => {
    if (min_lfd_nr === null || min_lfd_nr === undefined) return "#";
    const count = Number(position_count ?? 0);
    if (!Number.isFinite(count) || count <= 0) return `#${min_lfd_nr}`;
    if (count === 1) return `#${min_lfd_nr}`;
    return `#${min_lfd_nr}+${count - 1}`;
  };

  const fetchReklamationen = async () => {
    const token = sessionStorage.getItem('token');
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationen`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      setReklas(data);
      applyFilters(data, filters);
    } catch (error) {
      console.error('Fehler beim Laden der Reklamationen:', error);
      toast.error('Reklamationen konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    fetchReklamationen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDetails = async (id) => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationen/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReklaDetails((prev) => ({ ...prev, [id]: res.data }));
    } catch (err) {
      console.error("Fehler beim Laden der Detaildaten:", err);
      toast.error('Detaildaten konnten nicht geladen werden.');
    }
  };

  // ✅ Notiz-Draft automatisch setzen, sobald Details geladen sind (aber NICHT während offen+tippen)
  useEffect(() => {
    if (!activeReklaId) return;
    const details = reklaDetails[activeReklaId];
    if (!details?.reklamation) return;
    if (showNotiz) return;
    setNotizDraft(details.reklamation.notiz ?? '');
  }, [activeReklaId, reklaDetails, showNotiz]);

  // ✅ Notiz speichern per PATCH
  const saveNotiz = async (e) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (!activeReklaId) return;

    if (!canWriteNotiz) {
      toast.error("Keine Berechtigung: Notiz darf nur Admin/Supervisor speichern.");
      return;
    }

    const token = sessionStorage.getItem('token');
    const payload = { notiz: notizDraft };

    try {
      setNotizSaving(true);

      await axios.patch(`${import.meta.env.VITE_API_URL}/api/reklamationen/${activeReklaId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Notiz gespeichert.");
      await loadDetails(activeReklaId);
    } catch (err) {
      console.error("Fehler beim Speichern der Notiz:", err);
      toast.error("Notiz konnte nicht gespeichert werden.");
    } finally {
      setNotizSaving(false);
    }
  };

  const applyFilters = (data, newFilters) => {
    let result = [...data];

    if (newFilters.filiale !== 'Alle') {
      result = result.filter(r => r.filiale === newFilters.filiale);
    }
    if (newFilters.status !== 'Alle') {
      result = result.filter(r => r.status === newFilters.status);
    }
    if (newFilters.reklaNr) {
      const search = newFilters.reklaNr.toLowerCase();
      result = result.filter(r => (r.rekla_nr || "").toLowerCase().includes(search));
    }

    // ✅ Sortierung: primär Datum, sekundär min_lfd_nr
    result.sort((a, b) => {
      const ta = a?.datum ? new Date(a.datum).getTime() : 0;
      const tb = b?.datum ? new Date(b.datum).getTime() : 0;

      const da = Number.isFinite(ta) ? ta : 0;
      const db = Number.isFinite(tb) ? tb : 0;

      if (da !== db) {
        return newFilters.sortDatum === 'asc' ? da - db : db - da;
      }

      const la = a?.min_lfd_nr ?? Number.MAX_SAFE_INTEGER;
      const lb = b?.min_lfd_nr ?? Number.MAX_SAFE_INTEGER;

      return la - lb;
    });

    setFilteredReklas(result);
    setCurrentPage(1);
  };

  const handleFilterApply = (newFilters) => {
    setFilters(newFilters);
    applyFilters(reklas, newFilters);
  };

  const pagedData = filteredReklas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(filteredReklas.length / PAGE_SIZE);

  const visiblePages = () => {
    const start = Math.floor((currentPage - 1) / 5) * 5 + 1;
    return Array.from({ length: Math.min(5, totalPages - start + 1) }, (_, i) => start + i);
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return "-";
    return new Date(isoDate).toLocaleDateString('de-DE');
  };

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case 'angelegt': return 'text-blue-600';
      case 'bearbeitet':
      case 'in bearbeitung': return 'text-yellow-600';
      case 'freigegeben': return 'text-green-600';
      case 'abgelehnt': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleZurueck = () => { window.location.href = "/start"; };
  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleCreateSuccess = () => {
    fetchReklamationen();
    setCurrentPage(1);
  };

  const openEditModal = () => {
    setShowEditModal(true);
  };

  // List-Grid: exakt wie in deinem Ist-Stand
  const LIST_GRID = "grid-cols-[100px_140px_120px_minmax(0,1fr)_minmax(0,1fr)_120px]";

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">
      <style jsx>{`
        @keyframes arrowWiggle {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-10px); }
        }
        @keyframes plusPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.35); }
        }
        @keyframes pencilScribble {
          0% { stroke-dashoffset: 30; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      <div
        className="absolute top-[20px] text-xl font-semibold text-white cursor-pointer select-none"
        style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Angemeldet als: {displayName}
        {menuOpen && (
          <div className="absolute right-0 mt-2 bg-white/90 text-black rounded shadow-lg z-50 px-5 py-4 backdrop-blur-sm" style={{ minWidth: '180px' }}>
            <div onClick={handleLogout} className="hover:bg-gray-100 cursor-pointer flex items-center gap-3 py-2 px-2 rounded transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#444" viewBox="0 0 24 24">
                <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" />
                <path d="M20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
              <span>Abmelden</span>
            </div>
          </div>
        )}
      </div>

      <div
        className="absolute top-[180px] left-[90px] cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
        onClick={handleZurueck}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36" height="36"
          fill="white"
          viewBox="0 0 24 24"
          className="transition-all duration-200 group-hover:animate-[arrowWiggle_1s_ease-in-out_infinite]"
        >
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        <span className="text-2xl font-medium">Zurück zum Hauptmenü</span>
      </div>

      <div className="absolute top-[180px] right-[80px] flex gap-12 items-center text-white">
        <div
          className="cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
          onClick={() => setShowCreateModal(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36" height="36"
            fill="white"
            viewBox="0 0 24 24"
            className="transition-all duration-200 group-hover:animate-[plusPulse_1.4s_ease-in-out_infinite]"
          >
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          <span className="text-2xl font-medium">Reklamation anlegen</span>
        </div>

        {canEdit && (
          <div
            className="cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
            onClick={openEditModal}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              <path
                d="M14 5.5 l-2.5 3"
                stroke="white"
                strokeWidth="3"
                strokeDasharray="30"
                strokeDashoffset="30"
                className="transition-all duration-200 group-hover:animate-[pencilScribble_1.6s_ease-in-out_infinite]"
              />
            </svg>
            <span className="text-2xl font-medium">Reklamation bearbeiten</span>
          </div>
        )}

        <div
          className="cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
          onClick={() => setShowFilterModal(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="white" viewBox="0 0 24 24">
            <path d="M3 4h18v2H3V4zm2 4h14v2H5V8zm2 4h10v2H7v-2zm2 4h6v2H9v-2z" />
          </svg>
          <span className="text-2xl font-medium">Filter</span>
        </div>
      </div>

      <h1
        className="absolute text-6xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)] text-white z-10"
        style={{ top: '100px', left: '92px' }}
      >
        {headlineText}
      </h1>

      <div className="pt-64 px-[80px]">
        {/* Header */}
        <div className={`grid ${LIST_GRID} text-left font-bold text-gray-300 border-b border-gray-500 pb-2 mb-6`}>
          <div>lfd. Nr.</div>
          <div>Datum</div>
          <div>Filiale</div>
          <div>Rekla-Nr.</div>
          <div>Lieferant</div>
          <div className="text-right">Status</div>
        </div>

        {pagedData.map(rekla => (
          <div
            key={rekla.id}
            className={`grid ${LIST_GRID} bg-white text-black px-4 py-3 mb-2 rounded-lg shadow cursor-pointer hover:bg-gray-100 transition`}
            onClick={() => {
              setActiveReklaId(rekla.id);

              // ✅ Notiz-Zustand beim Öffnen resetten
              setShowNotiz(false);
              setNotizDraft('');

              if (!reklaDetails[rekla.id]) loadDetails(rekla.id);
            }}
          >
            <div className="font-bold">
              {formatLfdDisplay({ min_lfd_nr: rekla.min_lfd_nr, position_count: rekla.position_count })}
            </div>
            <div>{formatDate(rekla.datum)}</div>
            <div>{rekla.filiale || "-"}</div>
            <div className="whitespace-nowrap overflow-hidden text-ellipsis pr-2" title={rekla.rekla_nr || ""}>
              {rekla.rekla_nr || "-"}
            </div>
            <div className="whitespace-nowrap overflow-hidden text-ellipsis pr-2" title={rekla.lieferant || ""}>
              {rekla.lieferant || "-"}
            </div>
            <div className={`text-right font-semibold ${getStatusColor(rekla.status)}`}>
              {rekla.status}
            </div>
          </div>
        ))}

        <div className="flex justify-center items-center gap-3 mt-8 text-lg">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1 disabled:opacity-50">«</button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 disabled:opacity-50">‹</button>
          {visiblePages().map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded ${page === currentPage ? 'bg-white text-black font-bold' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
            >
              {page}
            </button>
          ))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 disabled:opacity-50">›</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1 disabled:opacity-50">»</button>
        </div>
      </div>

      {/* Detail-Modal */}
      {activeReklaId && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setActiveReklaId(null)}
        >
          <div
            onClick={() => setActiveReklaId(null)}
            className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-160px)] max-w-7xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8">
              {!reklaDetails[activeReklaId] ? (
                <div className="text-center py-20 text-2xl text-gray-600">
                  Lade Details...
                </div>
              ) : (
                <>
                  <div className="mb-5 border-b pb-3 flex items-center justify-between gap-6">
                    <h2 className="text-3xl font-bold">Reklamationsdetails</h2>

                    {(() => {
                      const r = reklaDetails[activeReklaId]?.reklamation;
                      const hasNotiz = !!(r?.notiz && String(r.notiz).trim().length > 0);

                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNotiz((prev) => !prev);
                          }}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                            hasNotiz ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-500"
                          } hover:opacity-90`}
                          title={hasNotiz ? "Notiz vorhanden" : "Keine Notiz"}
                        >
                          <Bookmark className="w-5 h-5" fill={hasNotiz ? "currentColor" : "none"} />
                          <span className="text-sm font-semibold">Notiz</span>
                        </button>
                      );
                    })()}
                  </div>

                  {showNotiz && (
                    <div className="mb-6" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const r = reklaDetails[activeReklaId]?.reklamation;
                        const hasMeta = !!(r?.notiz_von || r?.notiz_am);

                        return (
                          <>
                            <div className="flex items-end justify-between gap-6 mb-2">
                              <div className="text-lg font-bold">Interne Notiz</div>

                              {hasMeta && (
                                <div className="text-sm text-gray-600 text-right">
                                  {r?.notiz_von ? (
                                    <div>Notiz von: <span className="font-semibold">{r.notiz_von}</span></div>
                                  ) : null}
                                  {r?.notiz_am ? (
                                    <div>am: <span className="font-semibold">{new Date(r.notiz_am).toLocaleString('de-DE')}</span></div>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            <textarea
                              value={notizDraft}
                              onChange={(e) => setNotizDraft(e.target.value)}
                              readOnly={!canWriteNotiz}
                              placeholder={canWriteNotiz ? "Notiz hier eintragen..." : "Keine Berechtigung zum Bearbeiten."}
                              className={`w-full min-h-[110px] p-3 rounded-lg border resize-y outline-none ${
                                canWriteNotiz ? "border-gray-300 focus:border-blue-300" : "border-gray-200 bg-gray-50 text-gray-600"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            />

                            <div className="mt-2 flex items-center justify-between gap-6">
                              <div className="text-sm text-gray-600">
                                Löschen = Text leeren + Speichern.
                              </div>

                              {canWriteNotiz && (
                                <button
                                  type="button"
                                  onClick={saveNotiz}
                                  disabled={notizSaving}
                                  className="px-4 py-2 rounded-lg bg-[#800000] text-white font-semibold disabled:opacity-50"
                                >
                                  {notizSaving ? "Speichern..." : "Speichern"}
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {(() => {
                    const r = reklaDetails[activeReklaId]?.reklamation || {};
                    const hasTracking = r?.versand === true && !!(r?.tracking_id && String(r.tracking_id).trim().length > 0);

                    const lsTextRaw = r?.ls_nummer_grund ?? "";
                    const lsText = String(lsTextRaw || "").trim();
                    const showLs = lsText.length > 0;

                    return (
                      <>
                        <div className="grid grid-cols-[220px_140px_120px_minmax(0,1fr)_180px_140px] gap-4 items-center text-sm text-gray-700">
                          <div className="font-semibold text-gray-500">Rekla-Nr.</div>
                          <div className="font-semibold text-gray-500">Datum</div>
                          <div className="font-semibold text-gray-500">Filiale</div>
                          <div className="font-semibold text-gray-500">Lieferant</div>
                          <div className="font-semibold text-gray-500">Art</div>
                          <div className="font-semibold text-gray-500 text-right">Status</div>

                          <div className="text-base font-semibold text-black whitespace-nowrap overflow-hidden text-ellipsis" title={r?.rekla_nr || ""}>
                            {r?.rekla_nr || "-"}
                          </div>
                          <div className="text-base">{formatDate(r?.datum)}</div>
                          <div className="text-base whitespace-nowrap overflow-hidden text-ellipsis" title={r?.filiale || ""}>
                            {r?.filiale || "-"}
                          </div>
                          <div className="text-base whitespace-nowrap overflow-hidden text-ellipsis" title={r?.lieferant || ""}>
                            {r?.lieferant || "-"}
                          </div>
                          <div className="text-base whitespace-nowrap overflow-hidden text-ellipsis" title={r?.art || ""}>
                            {r?.art || "-"}
                          </div>
                          <div className={`text-base font-semibold text-right ${getStatusColor(r?.status)}`}>
                            {r?.status || "-"}
                          </div>
                        </div>

                        {showLs && (
                          <div className="mt-3 text-sm text-gray-700 flex gap-2 items-center">
                            <span className="font-semibold text-gray-500 whitespace-nowrap">LS / Grund:</span>
                            <span
                              className="whitespace-nowrap overflow-hidden text-ellipsis"
                              style={{ maxWidth: '100%' }}
                              title={lsText}
                            >
                              {lsText}
                            </span>
                          </div>
                        )}

                        {hasTracking && (
                          <div className="mt-1 text-sm text-gray-700 flex gap-2 items-center">
                            <span className="font-semibold text-gray-500 whitespace-nowrap">Tracking-ID:</span>
                            <span className="whitespace-nowrap overflow-hidden text-ellipsis" title={String(r.tracking_id)}>
                              {String(r.tracking_id)}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {reklaDetails[activeReklaId].positionen?.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-baseline justify-between mb-2">
                        <p className="font-bold text-lg text-gray-800">
                          Positionen ({reklaDetails[activeReklaId].positionen.length})
                        </p>
                      </div>

                      <div className="space-y-2">
                        {reklaDetails[activeReklaId].positionen.map((pos) => {
                          const artikel = pos?.artikelnummer ?? "-";
                          const ean = pos?.ean ?? "-";
                          const reklaMenge = pos?.rekla_menge ?? "-";
                          const reklaEinheit = pos?.rekla_einheit ?? "";
                          const bestellMenge = pos?.bestell_menge ?? "-";
                          const bestellEinheit = pos?.bestell_einheit ?? "";
                          const lfd = (pos?.lfd_nr ?? null);

                          return (
                            <div key={pos.id} className="border border-gray-200 rounded-lg px-3 py-2 bg-white">
                              <div className="grid grid-cols-[minmax(0,1fr)_220px_140px] gap-3 items-center">
                                <div className="font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis" title={String(artikel)}>
                                  {artikel}
                                </div>
                                <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis" title={String(ean)}>
                                  EAN: {ean}
                                </div>
                                <div className="text-right font-bold text-gray-700 whitespace-nowrap">
                                  #{lfd ?? "-"}
                                </div>
                              </div>

                              <div className="mt-1 text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                                <span className="font-medium">Rekla:</span> {reklaMenge} {reklaEinheit}
                                <span className="mx-2 text-gray-400">|</span>
                                <span className="font-medium">Bestellt:</span> {bestellMenge} {bestellEinheit}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t text-right text-sm text-gray-600">
                    Letzte Änderung: {formatDate(reklaDetails[activeReklaId]?.reklamation?.letzte_aenderung)}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateReklamationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showEditModal && (
        <EditReklamationModal
          onClose={() => setShowEditModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showFilterModal && (
        <FilterModal
          onClose={() => setShowFilterModal(false)}
          onApply={handleFilterApply}
          currentFilters={filters}
        />
      )}
    </div>
  );
}
