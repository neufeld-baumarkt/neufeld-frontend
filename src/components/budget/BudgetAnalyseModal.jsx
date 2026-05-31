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
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/10 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="select-none whitespace-nowrap text-3xl font-black uppercase tracking-[0.35em] text-white opacity-[0.045]">
              Built by Peter Neufeld - #TeamCode
            </div>
          </div>

          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white">Budgetanalyse</h2>
            <p className="text-sm text-white/60 mt-1">
              Managementansicht · Dynamisches Budgetsystem
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative z-10 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
          >
            Schließen
          </button>
        </div>

        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">
                Analysefilter
              </div>
              <div className="text-xs text-white/50 mt-0.5">
                Zeitraum und Filiale für die Management-Auswertung
              </div>
            </div>

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
        </div>

        <div className="flex-1 overflow-auto p-6 text-white">
          {children || (
            <div className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="text-lg font-bold">
                      {loading ? 'Analyse wird geladen…' : `KPI-Stand bis KW ${bisKw}`}
                    </div>

                    <div className="text-sm text-white/60 mt-1">
                      Filiale: {filiale} · Jahr: {jahr}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/15 px-4 py-2 text-right">
                    <div className="text-xs uppercase tracking-wide text-white/40">
                      Datenquelle
                    </div>
                    <div className="text-sm font-semibold text-white/80">
                      Budgetanalyse API
                    </div>
                  </div>
                </div>

                {!loading && !analyse && (
                  <div className="mb-5 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
                    Noch keine Analysedaten geladen.
                  </div>
                )}

                <BudgetAnalyseKpis kpis={analyse?.kpis} />
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold">
                      Budget- und Verbrauchsanalysen
                    </div>
                    <div className="text-sm text-white/60 mt-1">
                      Vergleich von Freigabe, Verbrauch, Modellen und Verbrauchsmix
                    </div>
                  </div>

                  <div className="text-xs text-white/40">
                    Darstellung bis KW {bisKw}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#242936] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                    <div className="mb-4 border-b border-white/10 pb-3">
                      <div className="text-sm font-bold text-white">
                        Budget vs Verbrauch YTD
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        Freigegebenes Budget gegen tatsächlichen Verbrauch
                      </div>
                    </div>
                    <BudgetAnalyseChartYtd weeks={analyse?.weeks} />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#242936] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                    <div className="mb-4 border-b border-white/10 pb-3">
                      <div className="text-sm font-bold text-white">
                        Wochenverbrauch
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        Bestellungen, Aktionen und Sonderbestellungen je KW
                      </div>
                    </div>
                    <BudgetAnalyseChartWochenverbrauch weeks={analyse?.weeks} />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#242936] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                    <div className="mb-4 border-b border-white/10 pb-3">
                      <div className="text-sm font-bold text-white">
                        Budgetmodelle vs Ist
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        57%-Modell, Dynamikmodell und tatsächliches Bestellverhalten
                      </div>
                    </div>
                    <BudgetAnalyseChartModelle weeks={analyse?.weeks} />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#242936] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                    <div className="mb-4 border-b border-white/10 pb-3">
                      <div className="text-sm font-bold text-white">
                        Verbrauchsmix YTD
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        Bestellungen, Aktionen und Sonderbestellungen
                      </div>
                    </div>
                    <BudgetAnalyseChartMix kpis={analyse?.kpis} />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}