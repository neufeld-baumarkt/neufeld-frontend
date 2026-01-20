// src/components/budget/BudgetHeader.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BudgetHeader({ headlineText }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem('user'));
  } catch (e) {
    console.warn('Benutzer konnte nicht geladen werden:', e);
  }
  const displayName = user?.name || 'Unbekannt';

  const handleZurueck = () => {
    navigate('/start');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    navigate('/');
  };

  return (
    <>
      {/* User Menu */}
      <div
        className="absolute top-[20px] text-xl font-semibold text-white cursor-pointer select-none z-20"
        style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Angemeldet als: {displayName}
        {menuOpen && (
          <div
            className="absolute right-0 mt-2 bg-white/90 text-black rounded shadow-lg z-50 px-5 py-4 backdrop-blur-sm"
            style={{ minWidth: '180px' }}
          >
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

      {/* Back to Start */}
      <div
        className="absolute top-[180px] left-[90px] cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group z-10"
        onClick={handleZurueck}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="white" viewBox="0 0 24 24">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        <span className="text-2xl font-medium">Zurück zum Hauptmenü</span>
      </div>

      {/* Headline */}
      <h1
        className="absolute text-6xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)] text-white z-10"
        style={{ top: '100px', left: '92px' }}
      >
        {headlineText}
      </h1>
    </>
  );
}
