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
  return String(n.toFixed(2));
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value).trim().replace(',', '.');
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function formatCurrency(value) {
  const n = toNumber(value);
  if (n === null) return '—';
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value).trim().replace(',', '.');
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function formatPercentUiFromDecimal(decimal01) {
  const n = parseNumber(decimal01);
  if (n === null) return '';
  return String((n * 100).toFixed(2));
}

function toDecimal01FromPercentUi(percentUi) {
  const n = parseNumber(percentUi);
  if (n === null) return null;
  return n / 100;
}

function BudgetSettingsModal({
  open,
  onClose,
  jahr,
  kw,
  effectiveFiliale,

  // Umsatz
  canEditUmsatz,
  umsatzInput,
  setUmsatzInput,
  setUmsatzDirty,
  savingUmsatz,
  onSaveUmsatz,
  currentUmsatzValue,

  // Rule
  canEditRule,
  ruleLoading,
  ruleSaving,
  percentUi,
  setPercentUi,
  mwstUi,
  onSaveRule,
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 px-4 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#2f2d2d] rounded-2xl border border-white/10 shadow-[6px_6px_18px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-bold">Budget-Einstellungen</div>
            <div className="text-white/70 text-sm mt-1">
              {jahr} · KW {kw} · Filiale: <span className="font-semibold">{effectiveFiliale || '—'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            Schließen
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Umsatz Vorwoche */}
          <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
            <div className="text-lg font-semibold">Umsatz Vorwoche</div>
            <div className="text-white/70 text-sm mt-1">
              Aktuell: <span className="font-semibold">{formatCurrency(currentUmsatzValue)}</span>
            </div>

            {!canEditUmsatz ? (
              <div className="mt-4 bg-black/20 rounded-xl p-3 text-white/80">
                Keine Berechtigung: Umsatz darf nur Admin/Supervisor pflegen.
              </div>
            ) : (
              <>
                <label className="flex flex-col gap-2 mt-4">
                  <span className="text-white/80 font-semibold">Umsatz (brutto)</span>
                  <input
                    value={umsatzInput}
                    onChange={(e) => {
                      setUmsatzInput(e.target.value);
                      setUmsatzDirty(true);
                    }}
                    placeholder="z. B. 11900,00"
                    inputMode="decimal"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-white outline-none focus:ring-2 focus:ring-white/30"
                  />
                </label>

                <div className="mt-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onSaveUmsatz}
                    disabled={savingUmsatz}
                    className="px-4 py-2 rounded-lg bg-[#800000] hover:bg-[#6c0000] transition disabled:opacity-50"
                  >
                    {savingUmsatz ? 'Speichere…' : 'Speichern'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Budget-Regel */}
          <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
            <div className="text-lg font-semibold">Budget-Regel (global)</div>
            <div className="text-white/70 text-sm mt-1">
              Gilt für alle Filialen – nur {jahr} · KW {kw}
            </div>

            {!canEditRule ? (
              <div className="mt-4 bg-black/20 rounded-xl p-3 text-white/80">
                Keine Berechtigung: Regel darf nur Admin/Supervisor pflegen.
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-white/80 font-semibold whitespace-nowrap">Satz</span>
                  <input
                    value={percentUi}
                    onChange={(e) => setPercentUi(e.target.value)}
                    inputMode="decimal"
                    placeholder={ruleLoading ? 'Lade…' : 'z. B. 48.00'}
                    disabled={ruleLoading || ruleSaving}
                    className="w-[140px] px-3 py-2 rounded-lg bg-white/10 text-white outline-none disabled:opacity-60"
                  />
                  <span className="text-white/80 font-semibold">%</span>
                </div>

                <div className="text-white/60 text-sm mt-3">
                  MwSt: <span className="font-semibold">{mwstUi || '—'}</span>
                </div>

                <div className="mt-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onSaveRule}
                    disabled={ruleLoading || ruleSaving}
                    className="px-4 py-2 rounded-lg bg-[#800000] hover:bg-[#6c0000] transition disabled:opacity-50"
                  >
                    {ruleSaving ? 'Speichere…' : 'Speichern'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 text-white/60 text-sm">
          Hinweis: Änderungen wirken sofort nach dem Speichern (Neu laden).
        </div>
      </div>
    </div>
  );
}

export default function Budget() {
  const user = safeParseUser();

  const rawFiliale = user?.filiale || '';
  const role = user?.role || '';

  const isFilialeUser = role === 'Filiale';
  const isSuperUser = !isFilialeUser;

  const canEditUmsatz = role === 'Admin' || role === 'Supervisor';
  const canEditRule = role === 'Admin' || role === 'Supervisor';

  const { year: defaultYear, week: defaultWeek } = useMemo(() => getIsoWeekYear(new Date()), []);
  const [jahr, setJahr] = useState(defaultYear);
  const [kw, setKw] = useState(defaultWeek);

  const [filiale, setFiliale] = useState(isSuperUser ? 'Ahaus' : rawFiliale);
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

  // Settings Modal
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Rule State (für Modal)
  const [ruleLoading, setRuleLoading] = useState(false);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [percentUi, setPercentUi] = useState('');
  const [mwstUi, setMwstUi] = useState('');

  const headlineText = isSuperUser ? 'Budgetliste' : `Budgetliste – Filiale ${rawFiliale}`;

  const baseUrl = import.meta.env.VITE_API_URL;

  const getToken = () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error('Kein Zugriffstoken gefunden.');
      return null;
    }
    return token;
  };

  const requireBasics = () => {
    if (!jahr || !kw) {
      toast.error('Jahr oder KW fehlt.');
      return false;
    }
    if (!effectiveFiliale || effectiveFiliale.trim() === '') {
      toast.error('Bitte eine Filiale auswählen.');
      return false;
    }
    return true;
  };

  const fetchBudget = async () => {
    const token = getToken();
    if (!token) return;
    if (!requireBasics()) return;

    try {
      setLoadingBudget(true);

      const res = await axios.get(`${baseUrl}/api/budget/week-summary`, {
        params: { jahr, kw, filiale: effectiveFiliale },
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(res.data);
    } catch (err) {
      console.error('Fehler beim Laden der Budgetdaten:', err);

      const payload = err?.response?.data;
      if (payload && typeof payload === 'object') {
        setData(payload);
        toast.error(payload?.message || 'Budgetdaten nicht vorhanden.');
      } else {
        toast.error('Budgetdaten konnten nicht geladen werden.');
        setData(null);
      }
    } finally {
      setLoadingBudget(false);
    }
  };

  const fetchBookings = async () => {
    const token = getToken();
    if (!token) return;
    if (!requireBasics()) return;

    try {
      setLoadingBookings(true);

      const res = await axios.get(`${baseUrl}/api/budget/bookings`, {
        params: { jahr, kw, filiale: effectiveFiliale },
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = res.data || {};
      setBookings(Array.isArray(payload.bookings) ? payload.bookings : Array.isArray(payload) ? payload : []);
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
    await fetchBudget();
    await fetchBookings();
  };

  // Booking CRUD (unverändert vorhanden)
  const createBooking = async (bookingBody) => {
    const token = getToken();
    if (!token) return false;
    if (!requireBasics()) return false;

    const payload = { ...bookingBody, jahr, kw, filiale: effectiveFiliale };

    try {
      setLoadingBookings(true);
      await axios.post(`${baseUrl}/api/budget/bookings`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Buchung angelegt.');
      await reloadAll();
      return true;
    } catch (err) {
      console.error('Fehler beim Anlegen der Buchung:', err);
      toast.error(err?.response?.data?.message || 'Buchung konnte nicht angelegt werden.');
      return false;
    } finally {
      setLoadingBookings(false);
    }
  };

  const updateBooking = async (id, bookingBody) => {
    const token = getToken();
    if (!token) return false;

    const payload = { ...bookingBody, jahr, kw, filiale: effectiveFiliale };

    try {
      setLoadingBookings(true);
      await axios.put(`${baseUrl}/api/budget/bookings/${encodeURIComponent(id)}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Buchung gespeichert.');
      await reloadAll();
      return true;
    } catch (err) {
      console.error('Fehler beim Speichern der Buchung:', err);
      toast.error(err?.response?.data?.message || 'Buchung konnte nicht gespeichert werden.');
      return false;
    } finally {
      setLoadingBookings(false);
    }
  };

  const deleteBooking = async (id) => {
    const token = getToken();
    if (!token) return false;

    try {
      setLoadingBookings(true);
      await axios.delete(`${baseUrl}/api/budget/bookings/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Buchung gelöscht.');
      await reloadAll();
      return true;
    } catch (err) {
      console.error('Fehler beim Löschen der Buchung:', err);
      toast.error(err?.response?.data?.message || 'Buchung konnte nicht gelöscht werden.');
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
    const token = getToken();
    if (!token) return;
    if (!requireBasics()) return;

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

    const body = { jahr, kw, filiale: effectiveFiliale, umsatz_vorwoche_brutto: n };

    try {
      setSavingUmsatz(true);

      const res = await axios.put(`${baseUrl}/api/budget/umsatz-vorwoche`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Umsatz gespeichert.');
      setUmsatzDirty(false);

      setData(res.data);
      await fetchBookings();
    } catch (err) {
      console.error('Fehler beim Speichern Umsatz Vorwoche:', err);
      toast.error(err?.response?.data?.message || 'Umsatz konnte nicht gespeichert werden.');
    } finally {
      setSavingUmsatz(false);
    }
  };

  const loadRule = async () => {
    if (!canEditRule) return;
    const token = getToken();
    if (!token) return;

    try {
      setRuleLoading(true);
      const res = await axios.get(`${baseUrl}/api/budget/rules`, {
        params: { jahr, kw },
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = res.data || {};
      setPercentUi(formatPercentUiFromDecimal(payload.prozentsatz));
      setMwstUi(payload.mwst_faktor !== undefined && payload.mwst_faktor !== null ? String(payload.mwst_faktor) : '');
    } catch (err) {
      console.error('Fehler beim Laden der Budget-Regel:', err);
      toast.error(err?.response?.data?.message || 'Budget-Regel konnte nicht geladen werden.');
      setPercentUi('');
      setMwstUi('');
    } finally {
      setRuleLoading(false);
    }
  };

  const saveRule = async () => {
    if (!canEditRule) return;
    const token = getToken();
    if (!token) return;

    const decimal01 = toDecimal01FromPercentUi(percentUi);
    if (decimal01 === null) {
      toast.error('Prozentsatz ist ungültig.');
      return;
    }
    if (decimal01 < 0 || decimal01 > 1) {
      toast.error('Prozentsatz muss zwischen 0 und 100 liegen.');
      return;
    }

    try {
      setRuleSaving(true);
      await axios.put(
        `${baseUrl}/api/budget/rules`,
        { jahr, kw, prozentsatz: decimal01 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Budget-Regel gespeichert.');
      await loadRule();
      await reloadAll();
    } catch (err) {
      console.error('Fehler beim Speichern der Budget-Regel:', err);
      toast.error(err?.response?.data?.message || 'Budget-Regel konnte nicht gespeichert werden.');
    } finally {
      setRuleSaving(false);
    }
  };

  // Wenn Jahr/KW wechselt: Rule neu ziehen (für Modal)
  useEffect(() => {
    if (!canEditRule) return;
    loadRule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jahr, kw]);

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jahr, kw, effectiveFiliale]);

  const disabledByLoading = loadingBudget || loadingBookings;
  const canOpenSettings = canEditUmsatz || canEditRule;

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">
      {/* Layout-Rahmen (identisch Stil) */}
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

      <BudgetHeader headlineText={headlineText} jahr={jahr} kw={kw} userRole={role} onRuleSaved={reloadAll} />

      {/* Controls-Leiste */}
      <div className="absolute top-[230px] left-[90px] right-[80px] flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <BudgetWeekNavigator jahr={jahr} kw={kw} setJahr={setJahr} setKw={setKw} />
          <FilialePicker isSuperUser={isSuperUser} filiale={filiale} setFiliale={setFiliale} />
        </div>

        <div className="flex items-center gap-4">
          {/* HIER: Statt Inline-Umsatz -> 1 Button -> gemeinsames Modal */}
          {canOpenSettings && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              disabled={disabledByLoading}
              className="px-5 py-3 rounded-lg bg-white/15 hover:bg-white/25 transition disabled:opacity-50"
              title="Umsatz Vorwoche + Budget-Regel bearbeiten"
            >
              Budget-Einstellungen
            </button>
          )}

          <button
            onClick={reloadAll}
            disabled={disabledByLoading}
            className="px-5 py-3 rounded-lg bg-white/15 hover:bg-white/25 transition disabled:opacity-50"
          >
            {disabledByLoading ? 'Lade…' : 'Neu laden'}
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

      <BudgetSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        jahr={jahr}
        kw={kw}
        effectiveFiliale={effectiveFiliale}
        canEditUmsatz={canEditUmsatz}
        umsatzInput={umsatzInput}
        setUmsatzInput={setUmsatzInput}
        setUmsatzDirty={setUmsatzDirty}
        savingUmsatz={savingUmsatz}
        onSaveUmsatz={saveUmsatz}
        currentUmsatzValue={mergedBudgetData?.umsatz_vorwoche_brutto}
        canEditRule={canEditRule}
        ruleLoading={ruleLoading}
        ruleSaving={ruleSaving}
        percentUi={percentUi}
        setPercentUi={setPercentUi}
        mwstUi={mwstUi}
        onSaveRule={saveRule}
      />
    </div>
  );
}
