// src/pages/Reklamationen.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
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

  // Notiz UI (nur im Detail-Modal)
  const [showNotePanel, setShowNotePanel] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

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
  const canEditNote = ['admin', 'supervisor'].includes((userRole || '').toLowerCase());

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

  // Falls im Detail-Endpoint nicht min_lfd_nr/position_count drin sind,
  // berechnen wir es notfalls aus den Positionen.
  const formatLfdFromDetails = (details) => {
    const rekla = details?.reklamation;
    if (rekla?.min_lfd_nr !== undefined && rekla?.position_count !== undefined) {
      return formatLfdDisplay({ min_lfd_nr: rekla.min_lfd_nr, position_count: rekla.position_count });
    }

    const pos = details?.positionen || [];
    const lfdList = pos
      .map(p => Number(p?.lfd_nr))
      .filter(n => Number.isFinite(n));

    if (lfdList.length === 0) return "#";

    const min = Math.min(...lfdList);
    const count = lfdList.length;
    if (count === 1) return `#${min}`;
    return `#${min}+${count - 1}`;
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
    // - fehlende min_lfd_nr (null) immer nach unten
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

  const formatDateTime = (isoDate) => {
    if (!isoDate) return "-";
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString('de-DE');
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

  // List-Grid: genau nach deiner Vorgabe
  // 1 lfdNr (fix) | 2 Datum (fix) | 3 Filiale (fix) | 4 ReklaNr (flex) | 5 Lieferant (flex) | 6 Status (fix rechts)
  const LIST_GRID = "grid-cols-[100px_140px_120px_minmax(0,1fr)_minmax(0,1fr)_120px]";

  const getActiveRekla = () => reklamationFromActive()?.reklamation;
  const reklamationFromActive = () => (activeReklaId ? reklaDetails?.[activeReklaId] : null);

  const hasNote = () => {
    const r = getActiveRekla();
    const n = (r?.notiz ?? "");
    return typeof n === 'string' && n.trim().length > 0;
  };

  const showTracking = () => {
    const r = getActiveRekla();
    const versand = r?.versand === true; // Option C: nur wenn wirklich true
    const tid = (r?.tracking_id ?? "").toString().trim();
    return versand && tid.length > 0;
  };

  const trackingIdValue = () => {
    const r = getActiveRekla();
    return (r?.tracking_id ?? "").toString().trim();
  };

  const fmtMenge = (menge, einheit) => {
    const m = (menge ?? "").toString().trim();
    const e = (einheit ?? "").toString().trim();
    if (!m && !e) return "-";
    return `${m || "-"}${e ? ` ${e}` : ""}`;
  };

  const toggleNotePanel = (e) => {
    // nicht das Modal schließen
    e?.stopPropagation?.();

    const r = getActiveRekla();
    const current = (r?.notiz ?? "").toString();
    setNoteDraft(current);
    setShowNotePanel((prev) => !prev);
  };

  const saveNote = async (e) => {
    e?.stopPropagation?.();

    if (!activeReklaId) return;
    if (!canEditNote) return;

    const token = sessionStorage.getItem('token');
    setNoteSaving(true);

    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/reklamationen/${activeReklaId}`,
        { notiz: noteDraft },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reload Details -> sichere Anzeige von notiz_von/notiz_am nach Backend-Update
      await loadDetails(activeReklaId);
    } catch (err) {
      console.error("Fehler beim Speichern der Notiz:", err);
    } finally {
      setNoteSaving(false);
    }
  };

  const clearNote = async (e) => {
    e?.stopPropagation?.();
    if (!canEditNote) return;
    setNoteDraft('');
    // speichert dann NULL via Backend (trim => null)
    await saveNote(e);
  };

  const closeDetailModal = () => {
    setActiveReklaId(null);
    setShowNotePanel(false);
    setNoteDraft('');
    setNoteSaving(false);
  };

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
        {/* Header: exakt deine Spaltenreihenfolge */}
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
              setShowNotePanel(false);
              setNoteDraft('');
              if (!reklaDetails[rekla.id]) loadDetails(rekla.id);
            }}
          >
            {/* 1) lfd. Nr. */}
            <div className="font-bold">
              {formatLfdDisplay({ min_lfd_nr: rekla.min_lfd_nr, position_count: rekla.position_count })}
            </div>

            {/* 2) Datum */}
            <div>{formatDate(rekla.datum)}</div>

            {/* 3) Filiale */}
            <div>{rekla.filiale || "-"}</div>

            {/* 4) Rekla-Nr (flex) - kein Umbruch, ellipsis + title */}
            <div
              className="whitespace-nowrap overflow-hidden text-ellipsis pr-2"
              title={rekla.rekla_nr || ""}
            >
              {rekla.rekla_nr || "-"}
            </div>

            {/* 5) Lieferant (flex) - kein Umbruch, ellipsis + title */}
            <div
              className="whitespace-nowrap overflow-hidden text-ellipsis pr-2"
              title={rekla.lieferant || ""}
            >
              {rekla.lieferant || "-"}
            </div>

            {/* 6) Status ganz rechts */}
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
          onClick={closeDetailModal}
        >
          <div
            // wie zuvor: Klick auf Karte schließt weiterhin,
            // aber Icon/Panel stoppen Propagation
            onClick={() => closeDetailModal()}
            className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-160px)] max-w-7xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8">
              {!reklaDetails[activeReklaId] ? (
                <div className="text-center py-20 text-2xl text-gray-600">
                  Lade Details...
                </div>
              ) : (
                <>
                  <div className="mb-6 border-b pb-4 flex items-center justify-between gap-6">
                    <h2 className="text-3xl font-bold">Reklamationsdetails</h2>

                    {/* Notiz Icon (Icon-Klick) */}
                    <div
                      className="cursor-pointer select-none"
                      onClick={toggleNotePanel}
                      title={hasNote() ? "Notiz vorhanden" : "Keine Notiz"}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="34"
                        height="34"
                        viewBox="0 0 24 24"
                        fill={hasNote() ? "#2563eb" : "#9ca3af"} // blau / grau
                      >
                        <path d="M6 2h12a2 2 0 0 1 2 2v18l-8-5-8 5V4a2 2 0 0 1 2-2z" />
                      </svg>
                    </div>
                  </div>

                  {/* Kopf: lfd Nr. raus, dafür Filiale/LS usw. */}
                  <div className="grid grid-cols-[220px_160px_140px_1fr_160px_160px] gap-4 mb-4 text-lg font-bold text-gray-700 border-b border-gray-300 pb-3">
                    <div>Rekla-Nr.</div>
                    <div>Datum</div>
                    <div>Filiale</div>
                    <div>Lieferant</div>
                    <div>Art</div>
                    <div className="text-right">Status</div>
                  </div>

                  <div className="grid grid-cols-[220px_160px_140px_1fr_160px_160px] gap-4 mb-4 text-lg">
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis" title={getActiveRekla()?.rekla_nr || ""}>
                      {getActiveRekla()?.rekla_nr || "-"}
                    </div>
                    <div>{formatDate(getActiveRekla()?.datum)}</div>
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis" title={getActiveRekla()?.filiale || ""}>
                      {getActiveRekla()?.filiale || "-"}
                    </div>
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis" title={getActiveRekla()?.lieferant || ""}>
                      {getActiveRekla()?.lieferant || "-"}
                    </div>
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis" title={getActiveRekla()?.art || ""}>
                      {getActiveRekla()?.art || "-"}
                    </div>
                    <div className={`text-right font-semibold ${getStatusColor(getActiveRekla()?.status)}`}>
                      {getActiveRekla()?.status}
                    </div>
                  </div>

                  {/* Zweite Kopfzeile: LS/Grund + Tracking Option C (nur wenn vorhanden) */}
                  <div className="grid grid-cols-[1fr_1fr] gap-6 mb-8 text-base text-gray-800">
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis" title={getActiveRekla()?.ls_nummer_grund || ""}>
                      <span className="font-semibold">LS/Grund:</span> {getActiveRekla()?.ls_nummer_grund || "-"}
                    </div>

                    {showTracking() ? (
                      <div className="text-right whitespace-nowrap overflow-hidden text-ellipsis" title={trackingIdValue()}>
                        <span className="font-semibold">Tracking-ID:</span> {trackingIdValue()}
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>

                  {/* Notiz Panel (Icon-Klick) */}
                  {showNotePanel && (
                    <div
                      className="mb-10 bg-gray-50 border border-gray-200 rounded-lg p-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between gap-6 mb-3">
                        <div className="font-bold text-xl text-gray-800">Notiz</div>
                        <div className="text-sm text-gray-600">
                          {getActiveRekla()?.notiz_von ? (
                            <>
                              Von <span className="font-semibold">{getActiveRekla()?.notiz_von}</span>
                              {" · "}
                              {formatDateTime(getActiveRekla()?.notiz_am)}
                            </>
                          ) : (
                            <>—</>
                          )}
                        </div>
                      </div>

                      {canEditNote ? (
                        <>
                          <textarea
                            className="w-full min-h-[110px] rounded-md border border-gray-300 p-3 text-base outline-none focus:ring-2 focus:ring-blue-200"
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Notiz eingeben…"
                          />

                          <div className="flex justify-end gap-3 mt-4">
                            <button
                              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:opacity-60"
                              onClick={clearNote}
                              disabled={noteSaving}
                              title="Notiz löschen"
                            >
                              Löschen
                            </button>
                            <button
                              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
                              onClick={saveNote}
                              disabled={noteSaving}
                              title="Notiz speichern"
                            >
                              {noteSaving ? "Speichere…" : "Speichern"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-base text-gray-800 whitespace-pre-wrap">
                          {hasNote() ? (getActiveRekla()?.notiz || "") : "Keine Notiz vorhanden."}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Positionen kompakter */}
                  {reklaDetails[activeReklaId].positionen?.length > 0 && (
                    <div className="mt-2">
                      <p className="font-bold text-xl mb-4">
                        Positionen ({reklaDetails[activeReklaId].positionen.length}) · lfd.: {formatLfdFromDetails(reklaDetails[activeReklaId])}
                      </p>

                      <div className="space-y-3">
                        {reklaDetails[activeReklaId].positionen.map((pos) => {
                          const reklaM = fmtMenge(pos?.rekla_menge, pos?.rekla_einheit);
                          const bestM = fmtMenge(pos?.bestell_menge, pos?.bestell_einheit);

                          return (
                            <div key={pos.id} className="bg-gray-50 px-5 py-4 rounded-lg border border-gray-200">
                              <div className="flex justify-between items-start gap-6">
                                <div className="font-semibold text-lg whitespace-nowrap overflow-hidden text-ellipsis" title={pos.artikelnummer || ""}>
                                  {pos.artikelnummer || "-"}
                                </div>
                                <div className="font-bold text-lg text-gray-700 whitespace-nowrap">
                                  #{pos.lfd_nr ?? "-"}
                                </div>
                              </div>

                              <div className="text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis" title={pos.ean || ""}>
                                EAN: {pos.ean || "-"}
                              </div>

                              <div className="mt-2 text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                                <span className="font-medium">Reklamiert:</span> {reklaM}
                                <span className="mx-3 text-gray-400">|</span>
                                <span className="font-medium">Bestellt:</span> {bestM}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-10 pt-6 border-t text-right text-sm text-gray-600">
                    Letzte Änderung: {formatDate(getActiveRekla()?.letzte_aenderung)}
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
