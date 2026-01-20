// src/pages/Budget.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

import BudgetHeader from '../components/budget/BudgetHeader';
import BudgetWeekNavigator from '../components/budget/BudgetWeekNavigator';
import FilialePicker from '../components/budget/FilialePicker';
import BudgetDataPanel from '../components/budget/BudgetDataPanel';

function getIsoWeekYear(date = new Date()) {
  // ISO week calculation (no libs)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

export default function Budget() {
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem('user'));
  } catch (e) {
    console.warn('Benutzer konnte nicht geladen werden:', e);
  }

  const rawFiliale = user?.filiale || '';
  const userRole = (user?.role || '').toLowerCase();

  const isSuperUser =
    !rawFiliale ||
    rawFiliale.trim() === '' ||
    rawFiliale.trim() === '-' ||
    rawFiliale.toLowerCase().trim() === 'alle' ||
    ['supervisor', 'manager', 'admin'].includes(userRole);

  const { year: defaultYear, week: defaultWeek } = useMemo(() => getIsoWeekYear(new Date()), []);
  const [jahr, setJahr] = useState(defaultYear);
  const [kw, setKw] = useState(defaultWeek);

  // Filiale: Filial-User fix, SuperUser auswählbar
  const [filiale, setFiliale] = useState(isSuperUser ? 'Ahaus' : (rawFiliale || ''));
  const effectiveFiliale = isSuperUser ? filiale : rawFiliale;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const headlineText = isSuperUser
    ? 'Budgetliste'
    : `Budgetliste – Filiale ${rawFiliale}`;

  const fetchBudget = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error('Kein Zugriffstoken gefunden.');
      return;
    }

    if (!jahr || !kw) {
      toast.error('Jahr oder KW fehlt.');
      return;
    }

    if (isSuperUser && (!effectiveFiliale || effectiveFiliale.trim() === '')) {
      toast.error('Bitte eine Filiale auswählen.');
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL;
    const url = `${baseUrl}/api/budget/${jahr}/${kw}${isSuperUser ? `?filiale=${encodeURIComponent(effectiveFiliale)}` : ''}`;

    try {
      setLoading(true);
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(res.data);
    } catch (err) {
      console.error('Fehler beim Laden der Budgetdaten:', err);
      toast.error('Budgetdaten konnten nicht geladen werden.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jahr, kw, effectiveFiliale]);

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">
      {/* Layout-Rahmen (identisch Stil) */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      <BudgetHeader headlineText={headlineText} />

      {/* Controls-Leiste */}
      <div className="absolute top-[230px] left-[90px] right-[80px] flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <BudgetWeekNavigator jahr={jahr} kw={kw} setJahr={setJahr} setKw={setKw} />
          <FilialePicker
            isSuperUser={isSuperUser}
            filiale={filiale}
            setFiliale={setFiliale}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchBudget}
            disabled={loading}
            className="px-5 py-3 rounded-lg bg-white/15 hover:bg-white/25 transition disabled:opacity-50"
          >
            {loading ? 'Lade…' : 'Neu laden'}
          </button>
        </div>
      </div>

      {/* 
        🔥🔥🔥 HIER BITTE DIE POSITION ÄNDERN, DU BLINDFISCH 🐟 🔥🔥🔥
        Dieser top-Wert steuert, WIE WEIT UNTEN die Budget-Kacheln beginnen.
        Wenn sich Kacheln mit Headline oder "Zurück zum Hauptmenü" überlappen:
        👉 einfach z. B. von top-[270px] auf top-[320px] oder top-[340px] erhöhen.
      */}
      <div className="absolute top-[310px] left-[90px] right-[80px] bottom-[40px] overflow-auto">
        <BudgetDataPanel data={data} loading={loading} />
      </div>
    </div>
  );
}
