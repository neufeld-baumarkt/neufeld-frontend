import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PAGE_SIZE = 10;

export default function Reklamationen() {
  const [reklas, setReklas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReklaId, setExpandedReklaId] = useState(null);
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

  const totalPages = Math.ceil(reklas.length / PAGE_SIZE);
  const pagedData = reklas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleZurueck = () => {
    window.location.href = "/start";
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    window.location.href = "/";
  };

  const formatDate = (isoDate) => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('de-DE');
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'angelegt': return 'text-blue-600';
      case 'bearbeitet': return 'text-yellow-600';
      case 'freigegeben': return 'text-green-600';
      case 'abgelehnt': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const visiblePages = () => {
    const pages = [];
    const start = Math.floor((currentPage - 1) / 5) * 5 + 1;
    const end = Math.min(start + 4, totalPages);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="relative w-screen h-screen bg-[#3A3838] text-white overflow-hidden">
      {/* Rahmen-Layout */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      {/* Userinfo oben rechts */}
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

      {/* Überschrift */}
      <div className="relative z-10 text-white p-8 ml-[60px] mt-[50px]">
        <h1 className="text-7xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)]">
          Reklamationsliste – Filiale {displayFiliale}
        </h1>
      </div>

      {/* Buttons */}
      <div className="absolute top-[180px] left-[90px] text-white text-2xl cursor-pointer" onClick={handleZurueck}>
        ⬅️ Zurück zum Hauptmenü
      </div>
      <div className="absolute top-[180px] right-[80px] flex gap-8 text-white text-2xl cursor-pointer">
        <span onClick={() => alert("Reklamation anlegen folgt...")}>➕ Reklamation anlegen</span>
        <span onClick={() => alert("Reklamation bearbeiten folgt...")}>✏️ Reklamation bearbeiten</span>
      </div>

      {/* Headline */}
      <div className="absolute top-[260px] left-[95px] right-[80px] text-xl text-gray-300 border-b border-gray-500 pb-1 flex font-bold">
        <div className="w-[100px]">lfd. Nr.</div>
        <div className="w-[180px]">Rekla-Nr.</div>
        <div className="w-[140px]">Datum</div>
        <div className="flex-1">Lieferant</div>
        <div className="w-[120px] text-right">Status</div>
      </div>

      {/* Reklamationen */}
      <div className="absolute top-[290px] left-[95px] right-[80px]" style={{ maxHeight: 'calc(100vh - 380px)' }}>
        <div className="space-y-2">
          {pagedData.map((rekla) => (
            <div
              key={rekla.id}
              className={`bg-white text-black px-4 py-2 rounded-lg shadow hover:bg-gray-100 cursor-pointer ${expandedReklaId === rekla.id ? 'flex-col' : 'flex justify-between items-center'}`}
              onClick={() => setExpandedReklaId(expandedReklaId === rekla.id ? null : rekla.id)}
            >
              {expandedReklaId === rekla.id && (
                <div className="text-left w-full">
                  <button onClick={(e) => { e.stopPropagation(); setExpandedReklaId(null); }} className="text-red-600 font-bold mb-2">× schließen</button>
                  <h2 className="text-xl font-bold mb-2">Rekla-Nr: {rekla.rekla_nr}</h2>
                  <p><strong>Fortlaufende Nr:</strong> #{rekla.laufende_nummer}</p>
                  <p><strong>Datum:</strong> {formatDate(rekla.datum)}</p>
                  <p><strong>Letzte Änderung:</strong> {formatDate(rekla.letzte_aenderung)}</p>
                  <p><strong>Art:</strong> {rekla.art}</p>
                  <p><strong>Lieferant:</strong> {rekla.lieferant}</p>
                  <p><strong>Filiale:</strong> {rekla.filiale}</p>
                  <p><strong>Status:</strong> {rekla.status}</p>
                </div>
              )}
              {expandedReklaId !== rekla.id && (
                <>
                  <div className="font-bold w-[100px]">#{rekla.laufende_nummer}</div>
                  <div className="w-[180px]">{rekla.rekla_nr}</div>
                  <div className="w-[140px]">{formatDate(rekla.datum)}</div>
                  <div className="flex-1 truncate pr-4">{rekla.lieferant}</div>
                  <div className={`w-[120px] text-right font-semibold ${getStatusColor(rekla.status)}`}>{rekla.status}</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="absolute bottom-[20px] left-[95px] right-[80px] flex justify-center items-center space-x-2 text-sm">
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
  );
}
