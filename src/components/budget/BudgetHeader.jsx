// src/components/budget/BudgetHeader.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

function parseNumber(value) {
  if (value === null || value === undefined) return null;
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

export default function BudgetHeader({ headlineText, jahr, kw, userRole, onRuleSaved }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const displayName = user?.name || 'Unbekannt';
  const role = (userRole || user?.role || '').trim();
  const canEdit = role === 'Admin' || role === 'Supervisor';

  const baseUrl = import.meta.env.VITE_API_URL;
  const token = sessionStorage.getItem('token');

  const [percentUi, setPercentUi] = useState('');
  const [mwstUi, setMwstUi] = useState('');
  const [saving, setSaving] = useState(false);

  const ruleKey = useMemo(() => `${jahr}-${kw}`, [jahr, kw]);

  const loadRule = async () => {
    if (!canEdit || !token) return;
    try {
      const res = await axios.get(
        `${baseUrl}/api/budget/rules`,
        {
          params: { jahr, kw },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPercentUi(formatPercentUiFromDecimal(res.data?.prozentsatz));
      setMwstUi(res.data?.mwst_faktor ? String(res.data.mwst_faktor) : '');
    } catch {
      toast.error('Budget-Regel konnte nicht geladen werden.');
    }
  };

  const saveRule = async () => {
    const decimal01 = toDecimal01FromPercentUi(percentUi);
    if (decimal01 === null || decimal01 < 0 || decimal01 > 1) {
      toast.error('Prozentsatz ungültig.');
      return;
    }

    try {
      setSaving(true);
      await axios.put(
        `${baseUrl}/api/budget/rules`,
        { jahr, kw, prozentsatz: decimal01 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Budget-Einstellungen gespeichert.');
      setSettingsOpen(false);
      onRuleSaved?.();
    } catch {
      toast.error('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadRule();
  }, [ruleKey, canEdit]);

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

      {/* Settings Button */}
      {canEdit && (
        <button
          onClick={() => setSettingsOpen(true)}
          className="absolute top-[20px] left-[90px] px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 z-20"
        >
          Budget-Einstellungen
        </button>
      )}

      {/* Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="w-full max-w-lg bg-[#2f2d2d] rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">
              Budget-Einstellungen · {jahr} KW {kw}
            </h2>

            <label className="block mb-4">
              <span className="text-sm text-white/70">Budget-Satz (%)</span>
              <input
                value={percentUi}
                onChange={(e) => setPercentUi(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded bg-white/10"
              />
            </label>

            <div className="text-white/60 text-sm mb-6">
              MwSt: {mwstUi || '—'}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setSettingsOpen(false)}>Abbrechen</button>
              <button
                onClick={saveRule}
                disabled={saving}
                className="px-4 py-2 rounded bg-[#800000]"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <div
        className="absolute top-[180px] left-[90px] cursor-pointer flex items-center gap-4 z-10"
        onClick={() => navigate('/start')}
      >
        ← Zurück zum Hauptmenü
      </div>

      <h1
        className="absolute text-6xl font-bold text-white z-10"
        style={{ top: '100px', left: '92px' }}
      >
        {headlineText}
      </h1>
    </>
  );
}
