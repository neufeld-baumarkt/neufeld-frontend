// src/pages/Cashflow.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function getIsoWeekYear(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

  return {
    year: d.getUTCFullYear(),
    week: weekNo,
  };
}

function safeParseUser() {
  try {
    return JSON.parse(sessionStorage.getItem('user'));
  } catch (e) {
    console.warn('Benutzer konnte nicht geladen werden:', e);
    return null;
  }
}

export default function Cashflow() {
  const user = safeParseUser();
  const navigate = useNavigate();

  const role = user?.role || '';
  const displayName = user?.name || user?.username || 'Unbekannt';

  const { year: defaultYear, week: defaultWeek } = useMemo(
    () => getIsoWeekYear(new Date()),
    []
  );

  const [jahr, setJahr] = useState(defaultYear);
  const [bisKw, setBisKw] = useState(defaultWeek);
  const [analyseOpen, setAnalyseOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [kpisError, setKpisError] = useState('');

  const canUseCashflow =
    role === 'Admin' ||
    role === 'Supervisor' ||
    role === 'Geschäftsführer';

  const years = [2024, 2025, 2026];
  const weeks = Array.from({ length: 53 }, (_, index) => index + 1);

  const loadKpis = async () => {
    if (!canUseCashflow) return;

    const token = sessionStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL;

    if (!token) {
      setKpisError('Kein Token gefunden.');
      return;
    }

    if (!baseUrl) {
      setKpisError('VITE_API_URL fehlt.');
      return;
    }

    setKpisLoading(true);
    setKpisError('');

    try {
      const response = await fetch(
        `${baseUrl}/api/cashflow/kpis?jahr=${jahr}&bisKw=${bisKw}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      console.log('Cashflow KPIs:', data);
      setKpis(data);
    } catch (error) {
      console.error('Cashflow KPIs konnten nicht geladen werden:', error);
      setKpis(null);
      setKpisError(error.message || 'Cashflow KPIs konnten nicht geladen werden.');
    } finally {
      setKpisLoading(false);
    }
  };

  useEffect(() => {
    loadKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jahr, bisKw, canUseCashflow]);

  const reloadAll = () => {
    loadKpis();
  };

  const handleZurueck = () => {
    navigate('/start');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">
      <style>{`
        @keyframes arrowWiggle {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-6px); }
        }
      `}</style>

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

      <div
        className="absolute top-[20px] text-xl font-semibold text-white cursor-pointer select-none"
        style={{
          right: '40px',
          textShadow: '3px 3px 6px rgba(0,0,0,0.6)',
        }}
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

      <div
        className="absolute top-[180px] left-[90px] cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
        onClick={handleZurueck}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36"
          height="36"
          fill="white"
          viewBox="0 0 24 24"
          className="transition-all duration-200 group-hover:animate-[arrowWiggle_1s_ease-in-out_infinite]"
        >
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        <span className="text-2xl font-medium">Zurück zum Hauptmenü</span>
      </div>

      <h1
        className="absolute text-8xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)] text-white z-10"
        style={{ top: '65px', left: '95px' }}
      >
        Cashflow
      </h1>

      <div className="absolute top-[230px] left-[90px] right-[80px] flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-3">
            <span className="font-semibold text-white/80">Jahr</span>
            <select
              value={jahr}
              onChange={(e) => setJahr(Number(e.target.value))}
              className="px-4 py-3 rounded-lg bg-white/15 text-white outline-none hover:bg-white/20"
            >
              {years.map((year) => (
                <option key={year} value={year} className="text-black">
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3">
            <span className="font-semibold text-white/80">bis KW</span>
            <select
              value={bisKw}
              onChange={(e) => setBisKw(Number(e.target.value))}
              className="px-4 py-3 rounded-lg bg-white/15 text-white outline-none hover:bg-white/20"
            >
              {weeks.map((week) => (
                <option key={week} value={week} className="text-black">
                  KW {week}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={!canUseCashflow}
            className="px-5 py-3 rounded-lg bg-white/15 hover:bg-white/25 transition disabled:opacity-50"
          >
            Neue Buchung
          </button>

          <button
            type="button"
            onClick={() => setAnalyseOpen(true)}
            disabled={!canUseCashflow}
            className="px-5 py-3 rounded-lg bg-white/15 hover:bg-white/25 transition disabled:opacity-50"
          >
            📊 Cashflowanalyse
          </button>

          <button
            type="button"
            onClick={reloadAll}
            disabled={!canUseCashflow}
            className="px-5 py-3 rounded-lg bg-white/15 hover:bg-white/25 transition disabled:opacity-50"
          >
            Neu laden
          </button>
        </div>
      </div>

      <div className="absolute top-[310px] left-[90px] right-[80px] bottom-[40px] overflow-auto pr-2">
        {!canUseCashflow ? (
          <div className="bg-white/10 border border-white/10 rounded-2xl p-8 shadow-[6px_6px_18px_rgba(0,0,0,0.45)]">
            <div className="text-2xl font-bold mb-2">Kein Zugriff</div>
            <div className="text-white/70">
              Das Cashflow-Modul ist nur für Admin, Supervisor und Geschäftsführer vorgesehen.
            </div>
          </div>
        ) : (
          <div className="bg-white/10 border border-white/10 rounded-2xl p-8 shadow-[6px_6px_18px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div>
                <div className="text-2xl font-bold">Buchungen</div>
                <div className="text-white/70 mt-1">
                  Jahr {jahr} · bis KW {bisKw}
                </div>
              </div>

              <div className="text-right text-white/60 text-sm">
                {kpisLoading ? 'Lade KPIs…' : kpisError ? 'KPI-Fehler' : kpis ? 'KPIs geladen' : 'Phase 1 · Grundseite'}
              </div>
            </div>

            {kpisError && (
              <div className="mb-4 rounded-xl bg-red-900/40 border border-red-400/30 px-4 py-3 text-red-100">
                {kpisError}
              </div>
            )}

            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 bg-black/30 px-4 py-3 text-sm font-semibold text-white/80">
                <div className="col-span-2">Datum</div>
                <div className="col-span-1">KW</div>
                <div className="col-span-3">Kategorie</div>
                <div className="col-span-3">Beschreibung</div>
                <div className="col-span-2 text-right">Betrag</div>
                <div className="col-span-1 text-right">Aktion</div>
              </div>

              <div className="px-4 py-10 text-center text-white/60">
                Noch keine Buchungsliste. KPI-Test läuft über Konsole.
              </div>
            </div>
          </div>
        )}
      </div>

      {analyseOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 px-4 flex items-center justify-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAnalyseOpen(false);
          }}
        >
          <div className="w-full max-w-5xl bg-[#2f2d2d] rounded-2xl border border-white/10 shadow-[6px_6px_18px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-bold">Cashflowanalyse</div>
                <div className="text-white/70 text-sm mt-1">
                  Jahr {jahr} · bis KW {bisKw}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAnalyseOpen(false)}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                Schließen
              </button>
            </div>

            <div className="p-8 text-white/60">
              Analyse-Komponenten folgen in Phase 2.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}