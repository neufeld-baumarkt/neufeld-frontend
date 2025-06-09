import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Startseite() {
  const user = JSON.parse(localStorage.getItem('user'));
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="relative w-screen h-screen bg-[#3A3838] overflow-hidden">
      {/* Top horizontal bar */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: "57px" }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: "57px" }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: "7px" }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: "7px" }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      {/* Überschrift */}
      <div className="relative z-10 text-white p-8 ml-[60px] mt-[50px]">
        <h1 className="text-7xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)]">Neufeld Baumarkt GmbH</h1>
      </div>

      {/* Rechts oben */}
      <div className="absolute top-[130px] text-2xl font-semibold text-white"
           style={{ right: '85px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}>
        Management Tool 3.0
      </div>
      <div className="absolute top-[175px] text-1xl font-semibold text-white"
           style={{ right: '85px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}>
        by Peter Neufeld
      </div>

      {/* Benutzerinformationen mit Dropdown */}
      <div className="absolute top-[20px] text-1xl font-semibold text-white cursor-pointer select-none"
           style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
           onClick={() => setMenuOpen(!menuOpen)}>
        Angemeldet als: {user?.name || 'Unbekannt'}
        {menuOpen && (
          <div className="absolute right-0 mt-2 bg-white/80 text-black rounded shadow z-50 px-4 py-2 backdrop-blur-sm"
               style={{ minWidth: '160px' }}>
            <div onClick={handleLogout} className="hover:bg-gray-100 cursor-pointer flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#444" viewBox="0 0 24 24">
                <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z"/>
                <path d="M20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
              </svg>
              <span>Abmelden</span>
            </div>
          </div>
        )}
      </div>

      {/* Hauptmenü Titel */}
      <div className="absolute text-4xl font-bold text-white"
           style={{ marginLeft: '105px', marginTop: '30px' }}>
        Hauptmenü
      </div>
    </div>
  );
}

export default Startseite;
