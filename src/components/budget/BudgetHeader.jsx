// src/components/budget/BudgetHeader.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BudgetHeader({ headlineText, jahr, kw, userRole }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const displayName = user?.name || 'Unbekannt';

  // Hinweis: "Budget-Einstellungen" werden NICHT mehr hier gesteuert,
  // sondern über den Button in Budget.jsx (Controls-Leiste).
  // userRole/jahr/kw bleiben trotzdem als Props vorhanden für spätere Erweiterungen.
  void jahr;
  void kw;
  void userRole;

  return (
    <>
      {/* User Menu */}
      <div
        className="absolute top-[20px] right-[40px] text-xl font-semibold cursor-pointer z-20"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Angemeldet als: {displayName}
        {menuOpen && (
          <div className="absolute right-0 mt-2 bg-white text-black rounded shadow px-4 py-2">
            <div onClick={() => navigate('/')} className="cursor-pointer">
              Abmelden
            </div>
          </div>
        )}
      </div>

      {/* Back */}
      <div
        className="absolute top-[180px] left-[90px] cursor-pointer flex items-center gap-4 z-10"
        onClick={() => navigate('/start')}
      >
        ← Zurück zum Hauptmenü
      </div>

      {/* Headline */}
      <h1
        className="absolute text-6xl font-bold text-white z-10"
        style={{ top: '100px', left: '92px' }}
      >
        {headlineText}
      </h1>
    </>
  );
}
