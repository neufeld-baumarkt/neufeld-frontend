import { useEffect, useMemo, useState } from 'react';
import MoneyCell from './MoneyCell';

const BRANCHES = ['Telgte', 'Ahaus', 'Vreden', 'Münster'];
const MONTHS = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const STATUS_STYLE = {
  ABGESCHLOSSEN: 'bg-emerald-700 text-white',
  PLAUSIBEL_BELEG_OFFEN: 'bg-amber-300 text-amber-950',
  ALARM: 'bg-red-700 text-white',
  WARTET_AUF_QLIK: 'bg-slate-200 text-slate-800',
  WARTET_AUF_TAGESABRECHNUNG: 'bg-slate-200 text-slate-800',
  PASST: 'bg-emerald-100 text-emerald-900',
  ABWEICHUNG: 'bg-red-600 text-white',
  UNVOLLSTAENDIG: 'bg-amber-100 text-amber-900',
  OFFEN: 'bg-slate-200 text-slate-700',
};
const STATUS_LABEL = {
  ABGESCHLOSSEN: 'Abgeschlossen',
  PLAUSIBEL_BELEG_OFFEN: 'Plausibel · Beleg offen',
  ALARM: 'Alarm',
  WARTET_AUF_QLIK: 'Wartet auf Qlik',
  WARTET_AUF_TAGESABRECHNUNG: 'Wartet auf Tagesabrechnung',
  PASST: 'Passt',
  ABWEICHUNG: 'Abweichung',
  UNVOLLSTAENDIG: 'Unvollständig',
  OFFEN: 'Offen',
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

function euro(cents, signed = false) {
  if (cents === null || cents === undefined) return '–';
  const formatted = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(cents) / 100);
  return signed && Number(cents) > 0 ? `+${formatted}` : formatted;
}

function toCents(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

function showQlikConfirmation(current, confirmation) {
  return {
    ...current,
    days: (current.days || []).map((day) => ({
      ...day,
      movements: day.movements.map((movement) => ({
        ...movement,
        cells: Object.fromEntries(Object.entries(movement.cells).map(([branch, cell]) => [
          branch,
          cell.qlik?.id === confirmation.qlikValueId ? {
            ...cell,
            qlik: {
              ...cell.qlik,
              confirmed: confirmation.confirmed,
              confirmedAt: confirmation.confirmedAt,
              confirmedBy: confirmation.confirmedBy,
            },
            valueStates: { ...cell.valueStates, soll: confirmation.sollState },
          } : cell,
        ])),
      })),
    })),
  };
}

function StatusBadge({ status, compact = false }) {
  return <span className={`inline-flex max-w-full items-center justify-center rounded-full px-2 py-1 text-center font-black ${compact ? 'text-[9px]' : 'text-[10px]'} ${STATUS_STYLE[status] || STATUS_STYLE.OFFEN}`}>
    {STATUS_LABEL[status] || status || 'Offen'}
  </span>;
}

function AutomaticValue({ cell, kind, busy, onConfirmQlik }) {
  const isQlik = kind === 'soll';
  const value = isQlik ? cell.sollCents : cell.istCents;
  const state = cell.valueStates?.[kind] || 'FEHLT';
  const pending = state === 'OFFEN';
  const title = isQlik
    ? pending ? 'Qlik-Wert vorhanden · Controllerbestätigung offen' : state === 'BESTAETIGT' ? `Qlik bestätigt${cell.qlik?.confirmedBy ? ` von ${cell.qlik.confirmedBy}` : ''}` : 'Qlik-Wert fehlt'
    : pending ? 'Tagesabrechnung vorhanden · Einzahlungsbeleg offen' : state === 'BESTAETIGT' ? 'Durch Einzahlungsbeleg verifiziert' : 'Tagesabrechnung fehlt';
  const content = <>
    <strong className={`block text-sm ${pending ? 'text-orange-700' : 'text-black'}`}>{euro(value)}</strong>
    {pending && <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wide text-orange-700">{busy ? 'Speichert …' : 'Bestätigung offen'}</span>}
  </>;

  if (isQlik && pending && cell.qlik?.id) {
    return <button type="button" disabled={busy} onClick={() => onConfirmQlik(cell.qlik.id)} title={`${title} · Klicken zum Bestätigen`} className="h-full min-h-[48px] w-full bg-orange-100 px-1 py-1.5 text-center hover:bg-orange-200 disabled:opacity-50">{content}</button>;
  }
  return <div title={title} className={`flex min-h-[48px] flex-col justify-center px-1 py-1.5 text-center ${pending ? 'bg-orange-100' : 'bg-white'}`}>{content}</div>;
}

function EzClassicView({ data, loading, confirmingIds, onConfirmQlik }) {
  return <section>
    <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
      <div><h3 className="text-lg font-black">Einzahlungen</h3><p className="text-xs text-white/55">Orange = Bestätigung offen · Schwarz = bestätigt</p></div>
    </div>
    <div className="overflow-auto rounded-xl border border-black/40 bg-white text-[#1f1f1f] shadow">
      <div className="min-w-[1660px]">
        <div className="grid grid-cols-[92px_repeat(12,130px)] border-b border-black/30 bg-[#d8d8d8] text-[11px] font-black">
          <div className="row-span-2 flex items-center justify-center border-r border-black/20 px-2 py-3">Datum</div>
          {BRANCHES.map((branch) => <div key={branch} className="col-span-3 border-r border-black/30 px-2 py-2 text-center">{branch}</div>)}
          {BRANCHES.flatMap((branch) => [
            <div key={`${branch}-qlik`} className="border-r border-t border-black/20 px-1 py-2 text-center">SOLL – via Qlik</div>,
            <div key={`${branch}-day`} className="border-r border-t border-black/20 px-1 py-2 text-center">IST – via Tagesabrechnung</div>,
            <div key={`${branch}-status`} className="border-r border-t border-black/20 px-1 py-2 text-center">Prüfstatus</div>,
          ])}
        </div>
        {loading && !data.days?.length ? <div className="p-12 text-center font-bold text-black/40">Monat wird geladen …</div> : data.days?.map((day) => {
          const movement = day.movements.find((entry) => entry.movementType === 'EZ');
          return <div key={day.businessDate} className="grid grid-cols-[92px_repeat(12,130px)] border-b border-black/15 bg-emerald-50/40 text-xs">
            <div className="flex items-center justify-center border-r border-black/15 px-2 py-2 font-bold">{String(day.day).padStart(2, '0')}.</div>
            {BRANCHES.flatMap((branch) => {
              const cell = movement.cells[branch];
              return [
                <div key={`${branch}-soll`} className="border-r border-black/15"><AutomaticValue cell={cell} kind="soll" busy={loading || confirmingIds.includes(cell.qlik?.id)} onConfirmQlik={onConfirmQlik}/></div>,
                <div key={`${branch}-ist`} className="border-r border-black/15"><AutomaticValue cell={cell} kind="ist" busy={false} onConfirmQlik={onConfirmQlik}/></div>,
                <div key={`${branch}-status`} className="flex min-h-[48px] flex-col items-center justify-center gap-1 border-r border-black/15 px-1 py-1"><StatusBadge status={cell.status} compact/>{cell.status === 'ALARM' && <span className="text-[10px] font-black text-red-700">Δ {euro(cell.evidence?.differenceCents, true)}</span>}</div>,
              ];
            })}
          </div>;
        })}
      </div>
    </div>
  </section>;
}

function AzClassicView({ data, loading, saving, onSave }) {
  return <section className="mt-7">
    <div className="mb-2"><h3 className="text-lg font-black">Auszahlungen</h3><p className="text-xs text-white/55">Bisheriger manueller Entwurf – wird separat fachlich festgelegt.</p></div>
    <div className="overflow-auto rounded-xl border border-black/40 bg-white text-[#1f1f1f] shadow">
      <div className="min-w-[1320px]">
        <div className="grid grid-cols-[92px_repeat(8,140px)_110px] border-b border-black/30 bg-[#e8e8e8] text-[11px] font-black">
          <div className="border-r border-black/20 px-2 py-3 text-center">Datum</div>
          {BRANCHES.flatMap((branch) => ['Soll', 'Ist'].map((kind) => <div key={`${branch}-${kind}`} className="border-r border-black/20 px-2 py-3 text-center">{branch} {kind}</div>))}
          <div className="px-2 py-3 text-center">Status</div>
        </div>
        {loading && !data.days?.length ? <div className="p-12 text-center font-bold text-black/40">Monat wird geladen …</div> : data.days?.map((day) => {
          const movement = day.movements.find((entry) => entry.movementType === 'AZ');
          return <div key={day.businessDate} className="grid grid-cols-[92px_repeat(8,140px)_110px] border-b border-black/15 text-xs">
            <div className="border-r border-black/15 px-2 py-2 text-center font-bold">{String(day.day).padStart(2, '0')}.</div>
            {BRANCHES.flatMap((branch) => {
              const cell = movement.cells[branch];
              return ['sollCents', 'istCents'].map((field) => <div key={`${branch}-${field}`} className="min-h-[38px] border-r border-black/15"><MoneyCell value={euros(cell[field])} disabled={loading || saving} onCommit={(value) => onSave({ day, movement, branch, cell, field, value })}/></div>);
            })}
            <div className="flex flex-wrap items-center justify-center gap-1 px-1 py-1" title={BRANCHES.map((branch) => `${branch}: ${STATUS_LABEL[movement.cells[branch].status]}`).join('\n')}>
              {BRANCHES.map((branch) => <span key={branch} className={`h-2.5 w-2.5 rounded-full ${movement.cells[branch].status === 'PASST' ? 'bg-emerald-500' : movement.cells[branch].status === 'ABWEICHUNG' ? 'bg-red-500' : 'bg-amber-400'}`}/>)}
            </div>
          </div>;
        })}
      </div>
    </div>
  </section>;
}

function ClassicView(props) {
  return <div className="space-y-2 overflow-auto pb-6"><EzClassicView {...props}/><AzClassicView {...props}/></div>;
}

function V2View({ data, loading, confirmingIds, onConfirmQlik }) {
  const relevantDays = useMemo(() => (data.days || []).filter((day) => day.movements.some((movement) => BRANCHES.some((branch) => {
    const cell = movement.cells[branch];
    return cell.sollCents !== null || cell.istCents !== null || cell.qlik?.valueCents !== null;
  }))), [data.days]);

  return <div className="space-y-4 overflow-auto pb-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Abgeschlossen', data.summary?.closed || 0, 'border-emerald-400/40 bg-emerald-950/35'],
        ['Alarm', data.summary?.alarms || 0, 'border-red-400/40 bg-red-950/35'],
        ['Plausibel · Beleg offen', data.summary?.receiptOpen || 0, 'border-amber-400/40 bg-amber-950/35'],
        ['Wartet auf Daten', data.summary?.waiting || 0, 'border-white/15 bg-white/5'],
      ].map(([label, value, style]) => <div key={label} className={`rounded-xl border p-4 ${style}`}><div className="text-3xl font-black">{value}</div><div className="mt-1 text-sm text-white/65">{label}</div></div>)}
    </div>

    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">Qlik und Tagesabrechnung werden sofort verglichen. Orange Werte warten auf ihre jeweilige Bestätigung. Ein unplausibler Unterschied löst bereits vor dem Einzahlungsbeleg Alarm aus.</div>

    {!relevantDays.length ? <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-white/45">Für diesen Monat liegen noch keine Werte oder Qlik-Signale vor.</div> : relevantDays.map((day) => <div key={day.businessDate} className="overflow-hidden rounded-xl border border-white/10 bg-white text-[#1f1f1f]">
      <div className="bg-[#e8e8e8] px-4 py-2 text-sm font-black">{day.businessDate.split('-').reverse().join('.')}</div>
      <div className="grid gap-px bg-black/10 md:grid-cols-2 xl:grid-cols-4">
        {BRANCHES.map((branch) => <div key={branch} className="bg-white p-3">
          <div className="mb-2 text-sm font-black">{branch}</div>
          {day.movements.map((movement) => {
            const cell = movement.cells[branch];
            const isEz = movement.movementType === 'EZ';
            return <div key={movement.movementType} className="mb-2 rounded-lg border border-black/10 p-2 last:mb-0">
              <div className="flex items-center justify-between gap-2"><b>{movement.label}</b><StatusBadge status={cell.status}/></div>
              {isEz ? <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <button type="button" disabled={loading || cell.valueStates?.soll !== 'OFFEN' || !cell.qlik?.id || confirmingIds.includes(cell.qlik?.id)} onClick={() => onConfirmQlik(cell.qlik.id)} className={`rounded-lg border p-2 text-left ${cell.valueStates?.soll === 'OFFEN' ? 'border-orange-300 bg-orange-100 text-orange-800 hover:bg-orange-200' : 'border-black/10 bg-white text-black'} disabled:cursor-default`}><span className="block text-[9px] font-black uppercase">SOLL · Qlik</span><strong className="mt-1 block">{euro(cell.sollCents)}</strong><span className="mt-1 block text-[9px]">{confirmingIds.includes(cell.qlik?.id) ? 'Speichert …' : cell.valueStates?.soll === 'OFFEN' ? 'Bestätigen' : cell.valueStates?.soll === 'BESTAETIGT' ? 'Bestätigt' : 'Fehlt'}</span></button>
                <div className={`rounded-lg border p-2 ${cell.valueStates?.ist === 'OFFEN' ? 'border-orange-300 bg-orange-100 text-orange-800' : 'border-black/10 bg-white text-black'}`}><span className="block text-[9px] font-black uppercase">IST · Tagesabrechnung</span><strong className="mt-1 block">{euro(cell.istCents)}</strong><span className="mt-1 block text-[9px]">{cell.valueStates?.ist === 'OFFEN' ? 'Einzahlungsbeleg offen' : cell.valueStates?.ist === 'BESTAETIGT' ? 'Beleg verifiziert' : 'Fehlt'}</span></div>
              </div> : <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><span>Soll: <b>{euro(cell.sollCents)}</b></span><span>Ist: <b>{euro(cell.istCents)}</b></span></div>}
              {isEz && cell.status === 'ALARM' && <div className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-black text-red-800">Unplausible Abweichung: {euro(cell.evidence?.differenceCents, true)}</div>}
              {!isEz && cell.qlik?.valueCents !== null && <div className="mt-1 text-[11px] text-black/55">Qlik: {euro(cell.qlik.valueCents)} · {cell.qlik.availabilityStatus}</div>}
              {!isEz && <div className="mt-1 text-[11px] text-black/55">Externer Originalbeleg erforderlich</div>}
            </div>;
          })}
        </div>)}
      </div>
    </div>)}
  </div>;
}

export default function AlexModule3({ year = 2026 }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getFullYear() === Number(year) ? now.getMonth() + 1 : 1);
  const [view, setView] = useState('classic');
  const [data, setData] = useState({ days: [], summary: {} });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingIds, setConfirmingIds] = useState([]);
  const [error, setError] = useState('');

  async function loadMonth(activeMonth = month) {
    setLoading(true); setError('');
    try {
      const { token, baseUrl } = apiBasics();
      const response = await fetch(`${baseUrl}/api/controlling/alex3/month?year=${year}&month=${activeMonth}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Monatsdaten konnten nicht geladen werden.');
      setData(payload);
    } catch (loadError) { setError(loadError.message || 'Monatsdaten konnten nicht geladen werden.'); setData({ days: [], summary: {} }); }
    finally { setLoading(false); }
  }

  async function confirmQlik(qlikValueId) {
    setConfirmingIds((current) => current.includes(qlikValueId) ? current : [...current, qlikValueId]);
    setError('');
    try {
      const { token, baseUrl } = apiBasics();
      const response = await fetch(`${baseUrl}/api/controlling/alex3/qlik-values/${encodeURIComponent(qlikValueId)}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (response.status === 409) {
        await loadMonth(month);
        throw new Error('Der Qlik-Wert wurde aktualisiert. Monat ist neu geladen – bitte den neuen Wert prüfen.');
      }
      if (!response.ok) throw new Error(payload?.message || 'Qlik-Wert konnte nicht bestätigt werden.');
      setData((current) => showQlikConfirmation(current, payload.confirmation));
    } catch (caught) { setError(caught.message || 'Qlik-Wert konnte nicht bestätigt werden.'); }
    finally { setConfirmingIds((current) => current.filter((id) => id !== qlikValueId)); }
  }

  async function saveCell({ day, movement, branch, cell, field, value }) {
    if (!cell.editable) return;
    setSaving(true); setError('');
    try {
      const { token, baseUrl } = apiBasics();
      const response = await fetch(`${baseUrl}/api/controlling/alex3/manual-values`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ businessDate: day.businessDate, branch, movementType: movement.movementType, sollCents: field === 'sollCents' ? toCents(value) : cell.sollCents, istCents: field === 'istCents' ? toCents(value) : cell.istCents, note: cell.note }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || 'Tageswert konnte nicht gespeichert werden.');
      await loadMonth(month);
    } catch (caught) { setError(caught.message || 'Tageswert konnte nicht gespeichert werden.'); }
    finally { setSaving(false); }
  }

  useEffect(() => { loadMonth(month); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [month, year]);

  function selectMonth(selectedMonth) {
    if (selectedMonth === month) loadMonth(selectedMonth);
    else setMonth(selectedMonth);
  }

  const shared = { data, loading, saving, confirmingIds, onSave: saveCell, onConfirmQlik: confirmQlik };
  return <div className="flex h-full min-h-0 flex-col text-white">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Alex Modul 3</div><div className="mt-1 text-sm font-bold">{view === 'classic' ? 'Klassische Excel-Ansicht' : 'Geführte V2-Prüfansicht'}</div></div><button type="button" onClick={() => setView(view === 'classic' ? 'v2' : 'classic')} className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/15">{view === 'classic' ? 'Zur V2-Ansicht wechseln' : 'Zur klassischen Ansicht wechseln'}</button></div>
    <div className="mb-4 flex flex-wrap gap-2">{MONTHS.map((name, index) => <button key={name} type="button" disabled={loading || saving} onClick={() => selectMonth(index + 1)} className={`rounded-lg border px-3 py-2 text-sm font-bold ${month === index + 1 ? 'border-[#800000] bg-[#800000]' : 'border-white/10 bg-white/5 text-white/65'}`}>{name}'{String(year).slice(-2)}</button>)}</div>
    {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm font-bold text-red-100">{error}</div>}
    <div className="min-h-0 flex-1">{view === 'classic' ? <ClassicView {...shared}/> : <V2View {...shared}/>}</div>
  </div>;
}
