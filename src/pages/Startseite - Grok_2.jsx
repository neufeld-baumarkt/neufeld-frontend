import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

function Startseite() {
  // --- Auth-Teil (unverändert) ---
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem('user'));
  } catch (e) {
    console.warn('❗ Benutzer konnte nicht geladen werden:', e);
  }
  const displayName = user?.name || 'Unbekannt';

  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    navigate('/');
  };

  // --- Stats für die Kacheln ---
  const [reklamationen, setReklamationen] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReklamationen = async () => {
      try {
        const response = await fetch('/api/reklamationen', {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`,
          },
        });

        if (!response.ok) throw new Error('Fehler beim Laden');
        const data = await response.json();
        setReklamationen(data);
        setLoading(false);
      } catch (err) {
        console.error('Fehler beim Laden der Reklamationen:', err);
        setLoading(false);
      }
    };

    fetchReklamationen();
  }, []);

  const stats = useMemo(() => {
    const offen = reklamationen.filter(
      (r) => r.status !== 'Erledigt' && r.status !== 'Abgeschlossen'
    ).length;

    const kritisch = reklamationen.filter(
      (r) =>
        r.status === 'Reklamation eingereicht' ||
        r.status === 'In Bearbeitung beim Lieferanten'
    ).length;

    const heute = new Date().toISOString().slice(0, 10);
    const neuHeute = reklamationen.filter(
      (r) => r.datum?.slice(0, 10) === heute
    ).length;

    return { offen, kritisch, neuHeute };
  }, [reklamationen]);

  return (
    <div className="relative w-screen h-screen bg-[#3A3838] overflow-hidden flex flex-col">
      <Toaster position="top-right" />

      {/* --- Klassischer Header-Bereich --- */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      <div className="relative z-10 text-white p-8 ml-[60px] mt-[50px]">
        <h1 className="text-7xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)]">Neufeld Baumarkt GmbH</h1>
      </div>

      <div className="absolute top-[130px] text-2xl font-semibold text-white" style={{ right: '85px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}>
        Management Tool 3.0
      </div>
      <div className="absolute top-[175px] text-xl font-semibold text-white" style={{ right: '85px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}>
        by Peter Neufeld
      </div>

      {/* Logout Dropdown */}
      <div
        className="absolute top-[20px] text-lg font-semibold text-white cursor-pointer select-none"
        style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Angemeldet als: {displayName}
        {menuOpen && (
          <div className="absolute right-0 mt-2 bg-white/90 text-black rounded shadow-xl z-50 px-4 py-3 backdrop-blur-sm" style={{ minWidth: '180px' }}>
            <div onClick={handleLogout} className="hover:bg-gray-200 cursor-pointer flex items-center gap-3 py-2 px-2 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#800000" viewBox="0 0 24 24">
                <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" />
                <path d="M20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
              <span className="font-medium">Abmelden</span>
            </div>
          </div>
        )}
      </div>

      {/* --- Ersatz für das alte Hauptmenü-Grid: Große Icon-Buttons --- */}
      <div className="absolute left-[100px] top-[100px] grid grid-cols-2 md:grid-cols-4 gap-8">
        <button
          onClick={() => navigate('/reklamationen')}
          className="flex flex-col items-center gap-4 p-6 bg-white/10 rounded-2xl hover:bg-white/20 transition transform hover:scale-110"
        >
          <img src="/icons/reklamation.png" alt="Reklamationen" className="w-24 h-24 drop-shadow-lg" />
          <span className="text-white text-2xl font-bold">Reklamationen</span>
        </button>

        <button
          onClick={() => navigate('/stoerungen')}
          className="flex flex-col items-center gap-4 p-6 bg-white/10 rounded-2xl hover:bg-white/20 transition transform hover:scale-110"
        >
          <img src="/icons/technik.png" alt="Technikstörungen" className="w-24 h-24 drop-shadow-lg" />
          <span className="text-white text-2xl font-bold">Technikstörungen</span>
        </button>

        <button
          onClick={() => navigate('/budgetliste')}
          className="flex flex-col items-center gap-4 p-6 bg-white/10 rounded-2xl hover:bg-white/20 transition transform hover:scale-110"
        >
          <img src="/icons/budget.png" alt="Budgetliste" className="w-24 h-24 drop-shadow-lg" />
          <span className="text-white text-2xl font-bold">Budgetliste</span>
        </button>

        <button
          onClick={() => navigate('/materialshop')}
          className="flex flex-col items-center gap-4 p-6 bg-white/10 rounded-2xl hover:bg-white/20 transition transform hover:scale-110"
        >
          <img src="/icons/materialshop.png" alt="Materialshop" className="w-24 h-24 drop-shadow-lg" />
          <span className="text-white text-2xl font-bold">Materialshop</span>
        </button>
      </div>

      {/* --- Stats-Kacheln + großer Button zu Reklamationen --- */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-20">
        <div className="max-w-5xl w-full">
          {/* Stats Cards */}
          {loading ? (
            <div className="text-center text-3xl text-white mb-16">Lade Statistiken...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
              <div className="bg-orange-50 border-4 border-orange-400 rounded-2xl p-12 shadow-2xl text-center">
                <div className="text-orange-700 text-2xl font-bold mb-4">Offene Reklamationen</div>
                <div className="text-orange-900 text-8xl font-extrabold">{stats.offen}</div>
              </div>

              <div className="bg-red-50 border-4 border-red-400 rounded-2xl p-12 shadow-2xl text-center">
                <div className="flex justify-center mb-6">
                  <AlertCircle size={64} className="text-red-700" />
                </div>
                <div className="text-red-700 text-2xl font-bold mb-4">Kritisch / Beim Lieferanten</div>
                <div className="text-red-900 text-8xl font-extrabold">{stats.kritisch}</div>
              </div>

              <div className="bg-blue-50 border-4 border-blue-400 rounded-2xl p-12 shadow-2xl text-center">
                <div className="text-blue-700 text-2xl font-bold mb-4">Neu heute</div>
                <div className="text-blue-900 text-8xl font-extrabold">{stats.neuHeute}</div>
              </div>
            </div>
          )}

          {/* Großer Button zu Reklamationen */}
          <div className="text-center">
            <button
              onClick={() => navigate('/reklamationen')}
              className="px-20 py-10 bg-[#800000] text-white text-5xl font-bold rounded-3xl hover:bg-[#990000] shadow-2xl transition transform hover:scale-105"
            >
              Zu den Reklamationen →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Startseite;