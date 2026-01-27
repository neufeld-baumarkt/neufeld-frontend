// src/pages/Budget.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

import BudgetHeader from '../components/budget/BudgetHeader';
import BudgetWeekNavigator from '../components/budget/BudgetWeekNavigator';
import FilialePicker from '../components/budget/FilialePicker';
import BudgetDataPanel from '../components/budget/BudgetDataPanel';
import BudgetBookingsPanel from '../components/budget/BudgetBookingsPanel';

function getIsoWeekYear(date = new Date()) {
  // ISO week calculation (no libs)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

function safeParseUser() {
  try {
    return JSON.parse(sessionStorage.getItem('user'));
  } catch (e) {
    console.warn('Benutzer konnte nicht geladen werden:', e);
    return null;
  }
}

function parseAmount(value) {
  const s = String(value ?? '').trim().replace(',', '.');
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

function formatAsInput(value) {
  if (value === null || value === undefined) return '';
  const n = parseAmount(value);
  if (n === null) return '';
  // Für Eingabe: keine Tausenderpunkte, einfach Standard-String
  return String(n.toFixed(2));
}

export default function Budget() {
  const user = safeParseUser();

  const rawFiliale = user?.filiale || '';
  const role = user?.role || '';

  // Verifiziert: Filiale-User haben role === "Filiale"
  const isFilialeUser = role === 'Filiale';
  const isSuperUser = !isFilialeUser; // Zentralrolle (Admin/Supervisor/Manager-1/GF/…)

  // Umsatz darf nur Admin/Supervisor pflegen (Backend-Recht)
  const canEditUmsatz = role === 'Admin' || role === 'Supervisor';

  const { year: defaultYear, week: defaultWeek } = useMemo(() => getIsoWeekYear(new Date()), []);
  const [jahr, setJahr] = useState(defaultYear);
  const [kw, setKw] = useState(defaultWeek);

  // Filiale: Filial-User fix, SuperUser auswählbar
  const [filiale, setFiliale] = useState(isSuperUser ? 'Ahaus' : (rawFiliale || ''));
  const effectiveFiliale = isSuperUser ? filiale : rawFiliale;

  const [loadingBudget, setLoadingBudget] = useState(false);
  const [data, setData] = useState(null);

  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [weekSummaryFromBookings, setWeekSummaryFromBookings] = useState(null);

  // Umsatz UI State
  const [umsatzInput, setUmsatzInput] = useState('');
  const [umsatzDirty, setUmsatzDirty] = useState(false);
  const [savingUmsatz, setSavingUmsatz] = useState(false);

  const headlineText = isSuperUser
    ? 'Budgetliste'
    : `Budgetliste – Filiale ${rawFiliale}`;

  const getAuth = () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error('Kein Zugriffstoken gefunden.');
      return null;
    }
    return { token };
  };

  const requireFilialeIfNeeded = () => {
    if (!jahr || !kw) {
      toast.error('Jahr oder KW fehlt.');
      return false;
    }
    if (isSuperUser && (!effectiveFiliale || effectiveFiliale.trim() === '')) {
      toast.error('Bitte eine Filiale auswählen.');
      return false;
    }
    return true;
  };

  const buildBudgetUrl = (path) => {
    const baseUrl = import.meta.env.VITE_API_URL;
    const qp = isSuperUser ? `?filiale=${encodeURIComponent(effectiveFiliale)}` : '';
    return `${baseUrl}${path}${qp}`;
  };

  const fetchBudget = async () => {
    const auth = getAuth();
    if (!auth) return;
    if (!requireFilialeIfNeeded()) return;

    const url = buildBudgetUrl(`/api/budget/${jahr}/${kw}`);

    try {
      setLoadingBudget(true);
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error('Fehler beim Laden der Budgetdaten:', err);

      // Wichtig: wenn Backend eine strukturierte Message liefert (z. B. 404),
      // geben wir diese an das UI weiter, damit BudgetDataPanel einen sinnvollen State zeigen kann.
      const payload = err?.response?.data;
      if (payload && typeof payload === 'object') {
        setData(payload);
        // Kein generisches "konnte nicht geladen werden", sonst wirkt es wie "kaputt".
        const msg = payload?.message || 'Budgetdaten nicht vorhanden.';
        toast.error(msg);
      } else {
        toast.error('Budgetdaten konnten nicht geladen werden.');
        setData(null);
      }
    } finally {
      setLoadingBudget(false);
    }
  };

  const fetchBookings = async () => {
    const auth = getAuth();
    if (!auth) return;
    if (!requireFilialeIfNeeded()) return;

    const url = buildBudgetUrl(`/api/budget/${jahr}/${kw}/bookings`);

    try {
      setLoadingBookings(true);
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      const payload = res.data || {};
      setBookings(Array.isArray(payload.bookings) ? payload.bookings : []);
      setWeekSummaryFromBookings(payload.week_summary || null);
    } catch (err) {
      console.error('Fehler beim Laden der Buchungen:', err);
      toast.error('Buchungen konnten nicht geladen werden.');
      setBookings([]);
      setWeekSummaryFromBookings(null);
    } finally {
      setLoadingBookings(false);
    }
  };

  const reloadAll = async () => {
    // bewusst nacheinander, damit UI nicht flackert + Fehler klarer sind
    await fetchBudget();
    await fetchBookings();
  };

  const createBooking = async (bookingBody) => {
    const auth = getAuth();
    if (!auth) return false;
    if (!requireFilialeIfNeeded()) return false;

    const url = buildBudgetUrl(`/api/budget/${jahr}/${kw}/bookings`);

    try {
      setLoadingBookings(true);
      await axios.post(url, bookingBody, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      toast.success('Buchung angelegt.');
      await reloadAll();
      return true;
    } catch (err) {
      console.error('Fehler beim Anlegen der Buchung:', err);
      const msg = err?.response?.data?.message || 'Buchung konnte nicht angelegt werden.';
      toast.error(msg);
      return false;
    } finally {
      setLoadingBookings(false);
    }
  };

  const updateBooking = async (id, bookingBody) => {
    const auth = getAuth();
    if (!auth) return false;

    const baseUrl = import.meta.env.VITE_API_URL;
    const url = `${baseUrl}/api/budget/bookings/${encodeURIComponent(id)}`;

    try {
      setLoadingBookings(true);
      await axios.put(url, bookingBody, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      toast.success('Buchung gespeichert.');
      await reloadAll();
      return true;
    } catch (err) {
      console.error('Fehler beim Speichern der Buchung:', err);
      const msg = err?.response?.data?.message || 'Buchung konnte nicht gespeichert werden.';
      toast.error(msg);
      return false;
    } finally {
      setLoadingBookings(false);
    }
  };

  const deleteBooking = async (id) => {
    const auth = getAuth();
    if (!auth) return false;

    const baseUrl = import.meta.env.VITE_API_URL;
    const url = `${baseUrl}/api/budget/bookings/${encodeURIComponent(id)}`;

    try {
      setLoadingBookings(true);
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      toast.success('Buchung gelöscht.');
      await reloadAll();
      return true;
    } catch (err) {
      console.error('Fehler beim Löschen der Buchung:', err);
      const msg = err?.response?.data?.message || 'Buchung konnte nicht gelöscht werden.';
      toast.error(msg);
      return false;
    } finally {
      setLoadingBookings(false);
    }
  };

  const mergedBudgetData = data || weekSummaryFromBookings || null;

  // Umsatz-Input initialisieren (aber nicht während User tippt überschreiben)
  useEffect(() => {
    setUmsatzDirty(false);

    const current = mergedBudgetData?.umsatz_vorwoche_brutto;
    setUmsatzInput(formatAsInput(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jahr, kw, effectiveFiliale]);

  useEffect(() => {
    if (umsatzDirty) return;
    const current = mergedBudgetData?.umsatz_vorwoche_brutto;
    setUmsatzInput(formatAsInput(current));
  }, [mergedBudgetData, umsatzDirty]);

  const saveUmsatz = async () => {
    const auth = getAuth();
    if (!auth) return;
    if (!requireFilialeIfNeeded()) return;

    if (!canEditUmsatz) {
      toast.error('Keine Berechtigung: Umsatz darf nur Admin/Supervisor pflegen.');
      return;
    }

    const n = parseAmount(umsatzInput);
    if (n === null) {
      toast.error('Umsatz ist ungültig.');
      return;
    }
    if (n < 0) {
      toast.error('Umsatz darf nicht negativ sein.');
      return;
    }

    const url = buildBudgetUrl(`/api/budget/${jahr}/${kw}/umsatz`);
    const body = { umsatz_vorwoche_brutto: n };

    try {
      setSavingUmsatz(true);
      const res = await axios.put(url, body, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      toast.success('Umsatz gespeichert.');
      setUmsatzDirty(false);

      // Response ist v_week_summary -> direkt als Budgetdaten setzen und dann alles neu ziehen
      setData(res.data);
      await fetchBookings();
    } catch (err) {
      console.error('Fehler beim Speichern Umsatz Vorwoche:', err);
      const msg = err?.response?.data?.message || 'Umsatz konnte nicht gespeichert werden.';
      toast.error(msg);
    } finally {
      setSavingUmsatz(false);
    }
  };

  useEffect(() => {
    // Initial + bei Steuerung
    reloadAll();
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
          {/* Umsatz-Vorwoche UI: nur Admin/Supervisor */}
          {canEditUmsatz && (
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
              <span className="text-lg font-semibold whitespace-nowrap">Umsatz Vorwoche</span>
              <input
                value={umsatzInput}
                onChange={(e) => { setUmsatzInput(e.target.value); setUmsatzDirty(true); }}
                placeholder="z. B. 11900,00"
                className="w-[180px] px-3 py-2 rounded-lg bg-white/10 text-white outline-none"
              />
              <button
                onClick={saveUmsatz}
                disabled={savingUmsatz || loadingBudget || loadingBookings}
                className="px-4 py-2 rounded-lg bg-[#800000] hover:bg-[#6c0000] transition disabled:opacity-50"
              >
                {savingUmsatz ? 'Speichere…' : 'Speichern'}
              </button>
            </div>
          )}

          <button
            onClick={reloadAll}
            disabled={loadingBudget || loadingBookings}
            className="px-5 py-3 rounded-lg bg-white/15 hover:bg-white/25 transition disabled:opacity-50"
          >
            {(loadingBudget || loadingBookings) ? 'Lade…' : 'Neu laden'}
          </button>
        </div>
      </div>

      <div className="absolute top-[310px] left-[90px] right-[80px] bottom-[40px] overflow-auto pr-2">
        <BudgetDataPanel data={mergedBudgetData} loading={loadingBudget} />

        <div className="mt-8">
          <BudgetBookingsPanel
            jahr={jahr}
            kw={kw}
            effectiveFiliale={effectiveFiliale}
            isSuperUser={isSuperUser}
            isFilialeUser={isFilialeUser}
            userRole={role}
            bookings={bookings}
            weekSummary={weekSummaryFromBookings}
            loading={loadingBookings}
            onReload={fetchBookings}
            onCreate={createBooking}
            onUpdate={updateBooking}
            onDelete={deleteBooking}
          />
        </div>
      </div>
    </div>
  );
}
