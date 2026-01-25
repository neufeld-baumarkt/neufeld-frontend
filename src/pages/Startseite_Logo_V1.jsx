import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function Startseite() {
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem('user'));
  } catch (e) {
    console.warn('❗ Benutzer konnte nicht geladen werden:', e);
  }
  const displayName = user?.name || 'Unbekannt';

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuGridOpen, setMenuGridOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    navigate('/');
  };

  // Nur Routen erlauben, die wirklich existieren
  const implementedRoutes = new Set([
    '/reklamationen',
    '/budgetliste',
  ]);

  const handleNavigate = (path) => {
    setMenuGridOpen(false);

    if (!implementedRoutes.has(path)) {
      toast('Zur Zeit noch in Bearbeitung.', { icon: '🛠️' });
      return;
    }

    navigate(path);
  };

  return (
    <div className="relative w-screen h-screen bg-[#3A3838] overflow-hidden">
      {/* Rahmen/Grundlayout – unverändert */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div
        className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]"
        style={{ height: '7px' }}
      ></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div
        className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]"
        style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}
      ></div>

      {/* ✅ LOGO – korrekt als dezentes Wasserzeichen, rund gecropped */}
      <div
        className="absolute z-[5] pointer-events-none select-none flex items-center justify-center"
        style={{
          left: '64px',   // 57px Rand + 7px Linie
          top: '64px',    // 57px Rand + 7px Linie
          right: '80px',
          bottom: '20px',
        }}
      >
        <div
          className="rounded-full overflow-hidden"
          style={{
            width: '420px',
            height: '420px',
            opacity: 0.12,
            filter: 'grayscale(20%) contrast(95%)',
          }}
        >
          <img
            src="/logonb-emblem.png"
            alt="Neufeld Baumarkt Emblem"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      </div>

      {/* Header – unverändert */}
      <div className="relative z-10 text-white p-8 ml-[60px] mt-[50px]">
        <h1 className="text-7xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)]">
          Neufeld Baumarkt GmbH
        </h1>
      </div>

      <div
        className="absolute top-[130px] text-2xl font-semibold text-white"
        style={{ right: '85px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
      >
        Management Tool 3.0
      </div>

      <div
        className="absolute top-[175px] text-1xl font-semibold text-white"
        style={{ right: '85px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
      >
        by Peter Neufeld
      </div>

      {/* User-Menü – unverändert */}
      <div
        className="absolute top-[20px] text-1xl font-semibold text-white cursor-pointer select-none"
        style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Angemeldet als: {displayName}
        {menuOpen && (
          <div
            className="absolute right-0 mt-2 bg-white/80 text-black rounded shadow z-50 px-4 py-2 backdrop-blur-sm"
            style={{ minWidth: '160px' }}
          >
            <div onClick={handleLogout} className="hover:bg-gray-100 cursor-pointer flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#444" viewBox="0 0 24 24">
                <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" />
                <path d="M20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
              <span>Abmelden</span>
            </div>
          </div>
        )}
      </div>

      {/* Hauptmenü (Hamburger) – unverändert */}
      <div
        className="absolute text-4xl font-bold text-white flex items-center gap-1"
        style={{ marginLeft: '100px', marginTop: '30px' }}
      >
        <button
          onClick={() => setMenuGridOpen(!menuGridOpen)}
          className="p-1 rounded hover:bg-white/10"
          style={{ transform: 'translateY(2px)' }}
        >
          <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        Hauptmenü
      </div>

      {/* Menü Grid – unverändert */}
      <div
        className={`absolute top-[230px] left-[155px] bg-white/80 backdrop-blur-sm rounded-xl shadow-xl z-50 overflow-hidden transition-all duration-300 ${
          menuGridOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'
        }`}
        style={{ minWidth: '180px' }}
        onMouseLeave={() => setMenuGridOpen(false)}
      >
        <div className="flex flex-col items-start gap-4 px-6 py-4 text-black text-left">
          <div className="group cursor-pointer" onClick={() => handleNavigate('/reklamationen')}>
            <img src="/icons/reklamation.png" alt="Reklamation" className="w-8 h-8 inline-block mr-2" />
            <span className="text-base font-semibold group-hover:text-[#800000] transition">Reklamationen</span>
          </div>

          <div className="group cursor-pointer" onClick={() => handleNavigate('/budgetliste')}>
            <img src="/icons/budget.png" alt="Budget" className="w-8 h-8 inline-block mr-2" />
            <span className="text-base font-semibold group-hover:text-[#800000] transition">Budgetliste</span>
          </div>

          <div className="group cursor-pointer" onClick={() => handleNavigate('/stoerungen')}>
            <img src="/icons/technik.png" alt="Technik" className="w-8 h-8 inline-block mr-2" />
            <span className="text-base font-semibold group-hover:text-[#800000] transition">Technikstörungen</span>
          </div>

          <div className="group cursor-pointer" onClick={() => handleNavigate('/materialshop')}>
            <img src="/icons/materialshop.png" alt="Materialshop" className="w-8 h-8 inline-block mr-2" />
            <span className="text-base font-semibold group-hover:text-[#800000] transition">Materialshop</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Startseite;
