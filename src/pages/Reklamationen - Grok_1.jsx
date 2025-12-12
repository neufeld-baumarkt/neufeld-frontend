// Reklamationen.jsx (Überlappung behoben – Buttons höher positioniert)
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PAGE_SIZE = 10;

export default function Reklamationen() {
  const [reklas, setReklas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeReklaId, setActiveReklaId] = useState(null);
  const [reklaDetails, setReklaDetails] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("user"));
  } catch (e) {
    console.warn("❗ Benutzer konnte nicht geladen werden:", e);
  }

  const displayName = user?.name || "Unbekannt";
  const displayFiliale = user?.filiale || "-";

  useEffect(() => {
    const fetchData = async () => {
      const token = sessionStorage.getItem('token');
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationen`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReklas(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Reklamationen:', error);
      }
    };
    fetchData();
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

  const pagedData = reklas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(reklas.length / PAGE_SIZE);

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
      case 'bearbeitet': return 'text-yellow-600';
      case 'freigegeben': return 'text-green-600';
      case 'abgelehnt': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleZurueck = () => {
    window.location.href = "/start";
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">
      {/* Rahmen-Design */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      {/* Userinfo mit Dropdown */}
      <div
        className="absolute top-[20px] text-xl font-semibold text-white cursor-pointer select-none"
        style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Angemeldet als: {displayName}
        {menuOpen && (
          <div className="absolute right-0 mt-2 bg-white/90 text-black rounded shadow-lg z-50 px-5 py-4 backdrop-blur-sm" style={{ minWidth: '180px' }}>
            <div
              onClick={handleLogout}
              className="hover:bg-gray-100 cursor-pointer flex items-center gap-3 py-2 px-2 rounded transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#444" viewBox="0 0 24 24">
                <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" />
                <path d="M20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
              <span>Abmelden</span>
            </div>
          </div>
        )}
      </div>

      {/* Zurück & Aktion-Buttons – jetzt höher, keine Überlappung mehr */}
      <div className="absolute top-[140px] left-[90px] text-white text-2xl cursor-pointer" onClick={handleZurueck}>
        ⬅️ Zurück zum Hauptmenü
      </div>
      <div className="absolute top-[140px] right-[80px] flex gap-10 text-white text-2xl">
        <span className="cursor-pointer hover:text-gray-300" onClick={() => alert("Reklamation anlegen folgt...")}>
          ➕ Reklamation anlegen
        </span>
        <span className="cursor-pointer hover:text-gray-300" onClick={() => alert("Reklamation bearbeiten folgt...")}>
          ✏️ Reklamation bearbeiten
        </span>
      </div>

      {/* Überschrift & Liste */}
      <div className="pt-24 px-[80px]">
        <h1 className="text-6xl font-bold mb-6 drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)]">
          Reklamationsliste – Filiale {displayFiliale}
        </h1>

        <div className="grid grid-cols-[100px_180px_140px_1fr_120px] text-left font-bold text-gray-300 border-b border-gray-500 pb-2 mb-4">
          <div>lfd. Nr.</div>
          <div>Rekla-Nr.</div>
          <div>Datum</div>
          <div>Lieferant</div>
          <div className="text-right">Status</div>
        </div>

        {pagedData.map(rekla => (
          <div
            key={rekla.id}
            className="grid grid-cols-[100px_180px_140px_1fr_120px] bg-white text-black px-4 py-3 mb-2 rounded-lg shadow cursor-pointer hover:bg-gray-100 transition"
            onClick={() => {
              setActiveReklaId(rekla.id);
              if (!reklaDetails[rekla.id]) loadDetails(rekla.id);
            }}
          >
            <div className="font-bold">#{rekla.laufende_nummer}</div>
            <div>{rekla.rekla_nr}</div>
            <div>{formatDate(rekla.datum)}</div>
            <div className="truncate pr-2">{rekla.lieferant}</div>
            <div className={`text-right font-semibold ${getStatusColor(rekla.status)}`}>
              {rekla.status}
            </div>
          </div>
        ))}

        {/* Pagination */}
        <div className="flex justify-center items-center gap-3 mt-8 text-lg">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1 disabled:opacity-50">&#171;</button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 disabled:opacity-50">&#8249;</button>
          {visiblePages().map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded ${page === currentPage ? 'bg-white text-black font-bold' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
            >
              {page}
            </button>
          ))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 disabled:opacity-50">&#8250;</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1 disabled:opacity-50">&#187;</button>
        </div>
      </div>

      {/* MODAL Detailkarte */}
      {activeReklaId && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setActiveReklaId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-160px)] max-w-7xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8">
              {!reklaDetails[activeReklaId] ? (
                <div className="text-center py-20 text-2xl text-gray-600">
                  Lade Details...
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-8 border-b pb-4">
                    <h2 className="text-3xl font-bold">Reklamationsdetails</h2>
                    <button
                      onClick={() => setActiveReklaId(null)}
                      className="text-4xl leading-none hover:text-red-600 transition"
                    >
                      ×
                    </button>
                  </div>

                  {/* Kopfzeile mit Überschriften */}
                  <div className="grid grid-cols-[100px_200px_160px_1fr_140px_140px] gap-4 mb-4 text-lg font-bold text-gray-700 border-b border-gray-300 pb-3">
                    <div>lfd. Nr.</div>
                    <div>Rekla-Nr.</div>
                    <div>Datum</div>
                    <div>Lieferant</div>
                    <div>Art</div>
                    <div className="text-right">Status</div>
                  </div>

                  {/* Datenzeile */}
                  <div className="grid grid-cols-[100px_200px_160px_1fr_140px_140px] gap-4 mb-8 text-lg">
                    <div className="font-bold">#{reklaDetails[activeReklaId]?.reklamation?.laufende_nummer}</div>
                    <div>{reklaDetails[activeReklaId]?.reklamation?.rekla_nr}</div>
                    <div>{formatDate(reklaDetails[activeReklaId]?.reklamation?.datum)}</div>
                    <div>{reklaDetails[activeReklaId]?.reklamation?.lieferant}</div>
                    <div>{reklaDetails[activeReklaId]?.reklamation?.art || "-"}</div>
                    <div className={`text-right font-semibold ${getStatusColor(reklaDetails[activeReklaId]?.reklamation?.status)}`}>
                      {reklaDetails[activeReklaId]?.reklamation?.status}
                    </div>
                  </div>

                  {/* Positionen */}
                  {reklaDetails[activeReklaId].positionen?.length > 0 && (
                    <div className="mt-6">
                      <p className="font-bold text-xl mb-4">
                        📦 Positionen ({reklaDetails[activeReklaId].positionen.length})
                      </p>
                      <div className="space-y-3">
                        {reklaDetails[activeReklaId].positionen.map((pos) => (
                          <div key={pos.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="font-semibold text-lg">{pos.artikelnummer}</div>
                            <div className="text-sm text-gray-600">EAN: {pos.ean || "-"}</div>
                            <div className="mt-2 text-sm">
                              <span className="font-medium">Reklamierte Menge:</span> {pos.rekla_menge} {pos.rekla_einheit}<br/>
                              <span className="font-medium">Bestellte Menge:</span> {pos.bestell_menge} {pos.bestell_einheit}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fußzeile */}
                  <div className="mt-10 pt-6 border-t text-right text-sm text-gray-600">
                    Letzte Änderung: {formatDate(reklaDetails[activeReklaId]?.reklamation?.letzte_aenderung)}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}