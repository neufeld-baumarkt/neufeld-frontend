import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import BudgetAnalyseKpis from './BudgetAnalyseKpis';
import BudgetAnalyseChartYtd from './BudgetAnalyseChartYtd';
import BudgetAnalyseChartWochenverbrauch from './BudgetAnalyseChartWochenverbrauch';
import BudgetAnalyseChartModelle from './BudgetAnalyseChartModelle';
import BudgetAnalyseChartMix from './BudgetAnalyseChartMix';

export default function BudgetAnalyseModal({ isOpen, onClose, children }) {
  const baseUrl = import.meta.env.VITE_API_URL;

  const currentWeek = useMemo(() => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;

    d.setUTCDate(d.getUTCDate() + 4 - dayNum);

    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }, []);

  const [filiale, setFiliale] = useState('Alle');
  const [jahr, setJahr] = useState(2026);
  const [bisKw, setBisKw] = useState(currentWeek);
  const [loading, setLoading] = useState(false);
  const [analyse, setAnalyse] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchAnalyse = async () => {
      const token = sessionStorage.getItem('token');

      if (!token) {
        toast.error('Kein Zugriffstoken gefunden.');
        return;
      }

      try {
        setLoading(true);

        const res = await axios.get(`${baseUrl}/api/budget/analyse`, {
          params: { jahr, filiale, bisKw },
          headers: { Authorization: `Bearer ${token}` },
        });

        setAnalyse(res.data);
      } catch (err) {
        console.error('Fehler beim Laden der Budgetanalyse:', err);
        setAnalyse(null);
        toast.error(err?.response?.data?.message || 'Budgetanalyse konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyse();
  }, [isOpen, baseUrl, jahr, filiale, bisKw]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-[20px] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.65)] border border-white/10 bg-[#1f232b] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">Budgetanalyse 2026</h2>
            <p className="text-sm text-white/60 mt-1">
              Managementansicht · Dynamisches Budgetsystem · Valuta-Analyse
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
          >
            Schließen
          </button>
        </div>

        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex flex-wrap gap-4">
            <select
              value={filiale}
              onChange={(e) => setFiliale(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[#2f3440] text-white border border-white/10"
            >
              <option className="bg-[#2f3440] text-white" value="Alle">Alle</option>
              <option className="bg-[#2f3440] text-white" value="Ahaus">Ahaus</option>
              <option className="bg-[#2f3440] text-white" value="Münster">Münster</option>
              <option className="bg-[#2f3440] text-white" value="Telgte">Telgte</option>
              <option className="bg-[#2f3440] text-white" value="Vreden">Vreden</option>
            </select>

            <select
              value={jahr}
              onChange={(e) => setJahr(Number(e.target.value))}
              className="px-4 py-2 rounded-lg bg-[#2f3440] text-white border border-white/10"
            >
              <option className="bg-[#2f3440] text-white" value={2026}>2026</option>
            </select>

            <select
              value={bisKw}
              onChange={(e) => setBisKw(Number(e.target.value))}
              className="px-4 py-2 rounded-lg bg-[#2f3440] text-white border border-white/10"
            >
              {Array.from({ length: 53 }, (_, index) => {
                const kw = index + 1;
                return (
                  <option key={kw} value={kw} className="bg-[#2f3440] text-white">
                    KW {kw}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 text-white">
          {children || (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-lg font-bold mb-1">
                {loading ? 'Analyse wird geladen…' : `KPI-Stand bis KW ${bisKw}`}
              </div>

              <div className="text-sm text-white/60">
                Filiale: {filiale} · Jahr: {jahr}
              </div>

              {!loading && !analyse && (
                <div className="mt-6 text-sm text-white/70">
                  Noch keine Analysedaten geladen.
                </div>
              )}

              <BudgetAnalyseKpis kpis={analyse?.kpis} />

              <div className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-2">
                <BudgetAnalyseChartYtd weeks={analyse?.weeks} />
                <BudgetAnalyseChartWochenverbrauch weeks={analyse?.weeks} />
                <BudgetAnalyseChartModelle weeks={analyse?.weeks} />
                <BudgetAnalyseChartMix kpis={analyse?.kpis} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}