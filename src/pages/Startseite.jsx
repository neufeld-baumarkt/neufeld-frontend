import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PushTaskCenter from '../components/tasks/PushTaskCenter';
import { canUsePushTaskPilot } from '../lib/pushTaskUi.mjs';

const menuItems = [
  { label: 'Reklamationen', path: '/reklamationen', image: '/Icons/reklamation.png', alt: 'Reklamation' },
  { label: 'Budgetliste', path: '/budgetliste', image: '/Icons/budget.png', alt: 'Budget' },
  { label: 'Controlling', path: '/cashflow', image: '/Icons/cashflow.png', alt: 'Cashflow' },
  { label: 'Bestellungen', path: '/bestellungen', image: '/Icons/Bestellungen_gruen_rund.png', alt: 'Bestellungen' },
  {
    label: 'Tageskassenabrechnung',
    path: '/tageskassenabrechnung',
    image: '/Icons/tageskassenabrechnung.png',
    alt: 'Tageskassenabrechnung',
  },
  { label: 'Technikstörungen', path: '/stoerungen', image: '/Icons/technik.png', alt: 'Technik' },
  { label: 'Materialshop', path: '/materialshop', image: '/Icons/materialshop.png', alt: 'Materialshop' },
];

function Startseite() {
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem('user'));
  } catch (error) {
    console.warn('❗ Benutzer konnte nicht geladen werden:', error);
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

  const implementedRoutes = new Set([
    '/reklamationen',
    '/budgetliste',
    '/bestellungen',
    '/cashflow',
    '/tageskassenabrechnung',
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
    <div className="relative min-h-screen min-h-dvh w-full overflow-x-hidden bg-[#3A3838] pb-10">
      <div className="absolute left-0 top-0 h-[57px] w-full bg-[#800000]" />
      <div className="absolute left-0 top-0 h-full w-[14px] bg-[#800000] sm:w-[32px] lg:w-[57px]" />
      <div className="absolute left-[14px] right-0 top-[57px] h-[7px] bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)] sm:left-[32px] lg:left-[57px]" />
      <div className="absolute bottom-0 left-[14px] top-[57px] w-[4px] bg-white sm:left-[32px] sm:w-[7px] lg:left-[57px]" />
      <div className="absolute left-[28px] right-4 top-[184px] h-[7px] bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)] sm:left-[56px] sm:right-10 sm:top-[190px] lg:left-[95px] lg:right-[80px] lg:top-[165px] lg:h-[11px]" />

      <div className="relative z-10 px-7 pt-[74px] text-white sm:px-14 sm:pt-[76px] lg:ml-[60px] lg:mt-[50px] lg:p-8">
        <h1 className="max-w-[calc(100vw-3.5rem)] text-3xl font-bold leading-tight drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)] sm:text-4xl lg:max-w-none lg:text-7xl">
          Neufeld Baumarkt GmbH
        </h1>
      </div>

      <div className="absolute right-4 top-[138px] text-sm font-semibold text-white drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)] sm:right-10 sm:top-[130px] sm:text-xl lg:right-[85px] lg:text-2xl">
        Management Tool 3.0
      </div>
      <div className="absolute right-4 top-[162px] text-xs font-semibold text-white drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)] sm:right-10 sm:top-[160px] sm:text-base lg:right-[85px] lg:top-[175px]">
        by Peter Neufeld
      </div>

      <div className="absolute right-3 top-2 z-30 select-none text-sm font-semibold text-white drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)] sm:right-10 sm:top-5 sm:text-base">
        <button
          type="button"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="min-h-11 rounded px-2 text-right hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span className="hidden sm:inline">Angemeldet als: </span>{displayName}
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-50 mt-1 min-w-[160px] rounded bg-white/90 px-2 py-2 text-black shadow backdrop-blur-sm">
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded px-2 text-left hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800000]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#444" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" />
                <path d="M20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
              <span>Abmelden</span>
            </button>
          </div>
        )}
      </div>

      <div className="absolute left-[28px] top-[205px] z-20 flex items-center gap-1 text-2xl font-bold text-white sm:left-[56px] sm:top-[215px] sm:text-3xl lg:left-[100px] lg:top-[205px] lg:text-4xl">
        <button
          type="button"
          aria-expanded={menuGridOpen}
          aria-controls="main-menu-grid"
          aria-label="Hauptmenü öffnen"
          onClick={() => setMenuGridOpen(!menuGridOpen)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg width="28" height="28" fill="white" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        Hauptmenü
      </div>

      <div
        id="main-menu-grid"
        className={`absolute left-[28px] right-4 top-[255px] z-50 overflow-hidden rounded-xl bg-white/90 shadow-xl backdrop-blur-sm transition-all duration-300 sm:left-[56px] sm:right-auto sm:top-[265px] sm:min-w-[220px] lg:left-[155px] lg:top-[230px] lg:min-w-[180px] ${
          menuGridOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-10 opacity-0'
        }`}
        onMouseLeave={() => setMenuGridOpen(false)}
      >
        <nav aria-label="Hauptmenü" className="flex flex-col items-stretch gap-1 px-3 py-3 text-left text-black sm:px-4 lg:items-start lg:gap-4 lg:px-6 lg:py-4">
          {menuItems.map((item) => (
            <button
              type="button"
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className="group flex min-h-12 w-full cursor-pointer items-center rounded-lg px-2 text-left hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800000] lg:min-h-0 lg:px-0 lg:hover:bg-transparent"
            >
              <img src={item.image} alt={item.alt} className="mr-3 h-9 w-9 shrink-0 rounded-full object-cover lg:mr-2 lg:h-8 lg:w-8" />
              <span className="text-base font-semibold transition group-hover:text-[#800000]">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {canUsePushTaskPilot(user?.role) && (
        <div className="relative z-20 mx-7 mt-[150px] sm:ml-[56px] sm:mr-10 sm:mt-24 lg:ml-[95px] lg:mr-[80px]">
          <PushTaskCenter user={user} compact />
        </div>
      )}
    </div>
  );
}

export default Startseite;
