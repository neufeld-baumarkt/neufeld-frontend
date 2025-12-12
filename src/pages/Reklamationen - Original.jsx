// Reklamationen.jsx (Modal-Version mit vollständigem Designrahmen + Pagination + Buttons + User-Dropdown)
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

  const formatDate = (isoDate) => new Date(isoDate).toLocaleDateString('de-DE');

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
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
      <div className="absolute top-[20px] text-1xl font-semibold text-white cursor-pointer select-none"
           style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
           onClick={() => setMenuOpen(!menuOpen)}>
        Angemeldet als: {displayName}
        {menuOpen && (
          <div className="absolute right-0 mt-2 bg-white/80 text-black rounded shadow z-50 px-4 py-2 backdrop-blur-sm"
               style={{ minWidth: '160px' }}>
            <div onClick={handleLogout} className="hover:bg-gray-100 cursor-pointer flex items-center gap-2">
              <span>🚪 Abmelden</span>
            </div>
          </div>
        )}
      </div>

      {/* Zurück & Aktion-Buttons */}
      <div className="absolute top-[180px] left-[90px] text-white text-2xl cursor-pointer" onClick={handleZurueck}>
        ⬅️ Zurück zum Hauptmenü
      </div>
      <div className="absolute top-[180px] right-[80px] flex gap-8 text-white text-2xl cursor-pointer">
        <span onClick={() => alert("Reklamation anlegen folgt...")}>➕ Reklamation anlegen</span>
        <span onClick={() => alert("Reklamation bearbeiten folgt...")}>✏️ Reklamation bearbeiten</span>
      </div>

      {/* Überschrift */}
      <div className="pt-24 px-[80px]">
        <h1 className="text-6xl font-bold mb-8 drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)]">
          Reklamationsliste – Filiale {displayFiliale}
        </h1>

        <div className="grid grid-cols-[100px_180px_140px_1fr_120px] text-left font-bold text-gray-300 border-b border-gray-500 pb-1 mb-4">
          <div>lfd. Nr.</div>
          <div>Rekla-Nr.</div>
          <div>Datum</div>
          <div>Lieferant</div>
          <div className="text-right">Status</div>
        </div>

        {pagedData.map(rekla => (
          <div
            key={rekla.id}
            className="grid grid-cols-[100px_180px_140px_1fr_120px] bg-white text-black px-4 py-2 mb-2 rounded-lg shadow cursor-pointer hover:bg-gray-100"
            onClick={() => {
              setActiveReklaId(rekla.id);
              if (!reklaDetails[rekla.id]) loadDetails(rekla.id);
            }}>
            <div className="font-bold">#{rekla.laufende_nummer}</div>
            <div>{rekla.rekla_nr}</div>
            <div>{formatDate(rekla.datum)}</div>
            <div className="truncate pr-2">{rekla.lieferant}</div>
            <div className={`text-right font-semibold ${getStatusColor(rekla.status)}`}>{rekla.status}</div>
          </div>
        ))}

        {/* Pagination komplett */}
        <div className="flex justify-center items-center gap-2 mt-6 text-sm">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2">&#171;</button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2">&#8249;</button>
          {visiblePages().map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded ${page === currentPage ? 'bg-white text-black' : 'bg-gray-700 text-white'}`}
            >
              {page}
            </button>
          ))}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2">&#8250;</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2">&#187;</button>
        </div>
      </div>

      {/* MODAL Detailkarte */}
      {activeReklaId && (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={() => setActiveReklaId(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-black p-6 rounded-lg shadow-xl w-[calc(100%-160px)] max-w-6xl max-h-[85vh] overflow-y-auto"
          >
            <div className="grid grid-cols-[100px_200px_160px_1fr_140px] gap-4 mb-3 text-lg font-bold">
              <div>#{reklaDetails[activeReklaId]?.reklamation?.laufende_nummer}</div>
              <div>{reklaDetails[activeReklaId]?.reklamation?.rekla_nr}</div>
              <div>{formatDate(reklaDetails[activeReklaId]?.reklamation?.datum)}</div>
              <div>{reklaDetails[activeReklaId]?.reklamation?.lieferant}</div>
              <div>{reklaDetails[activeReklaId]?.reklamation?.art}</div>
              <div className="text-right">{reklaDetails[activeReklaId]?.reklamation?.status}</div>
            </div>

            <div className="grid grid-cols-[1fr_120px_80px_120px_80px_1fr] gap-4 text-sm mb-4">
              <div>{reklaDetails[activeReklaId]?.positionen?.[0]?.rekla_menge}</div>
              <div>{reklaDetails[activeReklaId]?.positionen?.[0]?.rekla_einheit}</div>
              <div>{reklaDetails[activeReklaId]?.positionen?.[0]?.bestell_menge}</div>
              <div>{reklaDetails[activeReklaId]?.positionen?.[0]?.bestell_einheit}</div>
              <div className="text-right">Letzte Änderung: {formatDate(reklaDetails[activeReklaId]?.reklamation?.letzte_aenderung)}</div>
            </div>

            {reklaDetails[activeReklaId]?.positionen?.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold mb-1">📦 Positionen:</p>
                {reklaDetails[activeReklaId].positionen.map((pos, idx) => (
                  <div key={pos.id} className="ml-4 text-sm">
                    • {pos.artikelnummer} – {pos.rekla_menge} {pos.rekla_einheit} – {pos.bestell_menge} {pos.bestell_einheit} (EAN: {pos.ean})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
