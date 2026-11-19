import { useEffect, useMemo, useState } from 'react';
import MoneyCell from './MoneyCell';

const BRANCHES = ['Telgte', 'Ahaus', 'Vreden', 'Münster'];
const MONTHS = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const STATUS_STYLE = {
  AUTOMATISCH_GRUEN: 'bg-emerald-600 text-white',
  PASST: 'bg-emerald-100 text-emerald-900',
  ABWEICHUNG: 'bg-red-600 text-white',
  BELEG_FEHLT: 'bg-amber-400 text-black',
  UNVOLLSTAENDIG: 'bg-amber-100 text-amber-900',
  OFFEN: 'bg-slate-200 text-slate-700',
};

function apiBasics() {
  const token = sessionStorage.getItem('token');
  const baseUrl = import.meta.env.VITE_API_URL;
  if (!token) throw new Error('Kein Token gefunden.');
  if (!baseUrl) throw new Error('VITE_API_URL fehlt.');
  return { token, baseUrl };
}

function euros(cents) {
  return cents === null || cents === undefined ? '' : Number(cents) / 100;
}

function euro(cents) {
  if (cents === null || cents === undefined) return '–';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(cents) / 100);
}

function toCents(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${STATUS_STYLE[status] || STATUS_STYLE.OFFEN}`}>{String(status || 'OFFEN').replaceAll('_', ' ')}</span>;
}

function ClassicView({ data, loading, saving, onSave }) {
  return (
    <div className="overflow-auto rounded-xl border border-black/40 bg-white text-[#1f1f1f] shadow">
      <div className="min-w-[1320px]">
        <div className="grid grid-cols-[92px_46px_repeat(8,140px)_110px] border-b border-black/30 bg-[#e8e8e8] text-[11px] font-black">
          <div className="border-r border-black/20 px-2 py-3 text-center">Datum</div>
          <div className="border-r border-black/20 px-2 py-3 text-center">Art</div>
          {BRANCHES.flatMap((branch) => ['Soll', 'Ist'].map((kind) => <div key={`${branch}-${kind}`} className="border-r border-black/20 px-2 py-3 text-center">{branch} {kind}</div>))}
          <div className="px-2 py-3 text-center">Status</div>
        </div>
        {loading && !data.days?.length ? <div className="p-12 text-center font-bold text-black/40">Monat wird geladen …</div> : data.days?.flatMap((day) => day.movements.map((movement, movementIndex) => (
          <div key={`${day.businessDate}-${movement.movementType}`} className={`grid grid-cols-[92px_46px_repeat(8,140px)_110px] border-b border-black/15 text-xs ${movement.movementType === 'EZ' ? 'bg-emerald-50/50' : 'bg-white'}`}>
            <div className="border-r border-black/15 px-2 py-2 text-center font-bold">{movementIndex === 0 ? `${String(day.day).padStart(2, '0')}.` : ''}</div>
            <div className="border-r border-black/15 px-2 py-2 text-center font-black">{movement.label}</div>
            {BRANCHES.flatMap((branch) => {
              const cell = movement.cells[branch];
              return ['sollCents', 'istCents'].map((field) => (
                <div key={`${branch}-${field}`} className={`min-h-[38px] border-r border-black/15 ${cell.sourceMode === 'AUTOMATISCH' ? 'bg-emerald-100/80' : ''}`} title={cell.sourceMode === 'AUTOMATISCH' ? 'Automatische Vreden-EZ-Kette' : 'Manueller Klassikwert'}>
                  <MoneyCell
                    value={euros(cell[field])}
                    disabled={loading || saving || !cell.editable}
                    onCommit={(value) => onSave({ day, movement, branch, cell, field, value })}
                  />
                </div>
              ));
            })}
            <div className="flex flex-wrap items-center justify-center gap-1 px-1 py-1" title={BRANCHES.map((branch) => `${branch}: ${movement.cells[branch].status}`).join('\n')}>
              {BRANCHES.map((branch) => <span key={branch} className={`h-2.5 w-2.5 rounded-full ${movement.cells[branch].status === 'AUTOMATISCH_GRUEN' || movement.cells[branch].status === 'PASST' ? 'bg-emerald-500' : movement.cells[branch].status === 'ABWEICHUNG' ? 'bg-red-500' : 'bg-amber-400'}`} />)}
            </div>
          </div>
        )))}
      </div>
    </div>
  );
}

function V2View({ data }) {
  const relevantDays = useMemo(() => (data.days || []).filter((day) => day.movements.some((movement) => BRANCHES.some((branch) => {
    const cell = movement.cells[branch];
    return cell.sollCents !== null || cell.istCents !== null || cell.qlik?.valueCents !== null;
  }))), [data.days]);

  return (
    <div className="space-y-4 overflow-auto pb-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Automatisch grün', data.summary?.automaticGreen || 0, 'border-emerald-400/40 bg-emerald-950/35'],
          ['Abweichungen', data.summary?.deviations || 0, 'border-red-400/40 bg-red-950/35'],
          ['Fehlende Evidenz', data.summary?.missing || 0, 'border-amber-400/40 bg-amber-950/35'],
          ['Manuell offen', data.summary?.manualOpen || 0, 'border-white/15 bg-white/5'],
        ].map(([label, value, style]) => <div key={label} className={`rounded-xl border p-4 ${style}`}><div className="text-3xl font-black">{value}</div><div className="mt-1 text-sm text-white/65">{label}</div></div>)}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
        Vreden-EZ wird automatisch geprüft. Die übrigen EZ-Werte bleiben bis zum Filialrollout manuell. AZ zeigt den Qlik-Betrag als Prüfsignal; der externe Beleg bleibt menschlich zu kontrollieren.
      </div>

      {!relevantDays.length ? <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-white/45">Für diesen Monat liegen noch keine Werte oder Qlik-Signale vor.</div> : relevantDays.map((day) => (
        <div key={day.businessDate} className="overflow-hidden rounded-xl border border-white/10 bg-white text-[#1f1f1f]">
          <div className="bg-[#e8e8e8] px-4 py-2 text-sm font-black">{day.businessDate.split('-').reverse().join('.')}</div>
          <div className="grid gap-px bg-black/10 md:grid-cols-2 xl:grid-cols-4">
            {BRANCHES.map((branch) => <div key={branch} className="bg-white p-3">
              <div className="mb-2 text-sm font-black">{branch}</div>
              {day.movements.map((movement) => {
                const cell = movement.cells[branch];
                return <div key={movement.movementType} className="mb-2 rounded-lg border border-black/10 p-2 last:mb-0">
                  <div className="flex items-center justify-between gap-2"><b>{movement.label}</b><StatusBadge status={cell.status} /></div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><span>Soll: <b>{euro(cell.sollCents)}</b></span><span>Ist: <b>{euro(cell.istCents)}</b></span></div>
                  {cell.qlik?.valueCents !== null && <div className="mt-1 text-[11px] text-black/55">Qlik: {euro(cell.qlik.valueCents)} · {cell.qlik.availabilityStatus}</div>}
                  {movement.movementType === 'EZ' && cell.sourceMode === 'AUTOMATISCH' && <div className="mt-1 text-[11px] text-black/55">Tresorabschöpfung: {euro(cell.evidence?.safeSkimCents)} · Beleg: {euro(cell.evidence?.receiptCents)}</div>}
                  {movement.movementType === 'AZ' && <div className="mt-1 text-[11px] text-black/55">Externer Originalbeleg erforderlich</div>}
                </div>;
              })}
            </div>)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AlexModule3({ year = 2026 }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getFullYear() === Number(year) ? now.getMonth() + 1 : 1);
  const [view, setView] = useState('classic');
  const [data, setData] = useState({ days: [], summary: {} });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadMonth(activeMonth = month) {
    setLoading(true);
    setError('');
    try {
      const { token, baseUrl } = apiBasics();
      const response = await fetch(`${baseUrl}/api/controlling/alex3/month?year=${year}&month=${activeMonth}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Monatsdaten konnten nicht geladen werden.');
      setData(payload);
    } catch (loadError) {
      setError(loadError.message || 'Monatsdaten konnten nicht geladen werden.');
      setData({ days: [], summary: {} });
    } finally {
      setLoading(false);
    }
  }

  async function saveCell({ day, movement, branch, cell, field, value }) {
    if (!cell.editable) return;
    setSaving(true);
    setError('');
    try {
      const { token, baseUrl } = apiBasics();
      const payload = {
        businessDate: day.businessDate,
        branch,
        movementType: movement.movementType,
        sollCents: field === 'sollCents' ? toCents(value) : cell.sollCents,
        istCents: field === 'istCents' ? toCents(value) : cell.istCents,
        note: cell.note,
      };
      const response = await fetch(`${baseUrl}/api/controlling/alex3/manual-values`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || 'Tageswert konnte nicht gespeichert werden.');
      await loadMonth(month);
    } catch (saveError) {
      setError(saveError.message || 'Tageswert konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { loadMonth(month); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [month, year]);

  return <div className="flex h-full min-h-0 flex-col text-white">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Alex Modul 3</div><div className="mt-1 text-sm font-bold">{view === 'classic' ? 'Klassische Excel-Ansicht' : 'Geführte V2-Prüfansicht'}</div></div>
      <button type="button" onClick={() => setView(view === 'classic' ? 'v2' : 'classic')} className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/15">{view === 'classic' ? 'Zur V2-Ansicht wechseln' : 'Zur klassischen Ansicht wechseln'}</button>
    </div>
    <div className="mb-4 flex flex-wrap gap-2">{MONTHS.map((name, index) => <button key={name} type="button" disabled={loading || saving} onClick={() => setMonth(index + 1)} className={`rounded-lg border px-3 py-2 text-sm font-bold ${month === index + 1 ? 'border-[#800000] bg-[#800000]' : 'border-white/10 bg-white/5 text-white/65'}`}>{name}'{String(year).slice(-2)}</button>)}</div>
    {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm font-bold text-red-100">{error}</div>}
    <div className="min-h-0 flex-1">{view === 'classic' ? <ClassicView data={data} loading={loading} saving={saving} onSave={saveCell} /> : <V2View data={data} />}</div>
  </div>;
}
