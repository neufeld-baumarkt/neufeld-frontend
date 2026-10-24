import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import { employeePinApi } from '../../lib/employeePinApi';

const fieldClass = 'min-h-12 rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-white outline-none focus:border-red-300';
const primaryButton = 'min-h-12 rounded-xl bg-[#800000] px-5 font-black text-white hover:bg-[#960000] disabled:cursor-not-allowed disabled:opacity-40';
const secondaryButton = 'min-h-12 rounded-xl border border-white/20 bg-white/10 px-5 font-black hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40';

function BranchSelect({ branches, value, onChange }) {
  return <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">Stammfiliale / Zuordnung auswählen</option>
    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
  </select>;
}

function EmployeeFields({ branches, draft, setDraft }) {
  return <div className="grid gap-3 md:grid-cols-3">
    <BranchSelect branches={branches} value={draft.filiale_id} onChange={(filiale_id) => setDraft({ ...draft, filiale_id })} />
    <input className={fieldClass} value={draft.first_name} onChange={(event) => setDraft({ ...draft, first_name: event.target.value })} placeholder="Vorname" autoComplete="given-name" />
    <input className={fieldClass} value={draft.last_name} onChange={(event) => setDraft({ ...draft, last_name: event.target.value })} placeholder="Nachname" autoComplete="family-name" />
  </div>;
}

export default function EmployeePinManagement() {
  const [data, setData] = useState({ filialen: [], employees: [] });
  const branches = data?.filialen || [];
  const employees = data?.employees || [];
  const [mode, setMode] = useState('create');
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState({ filiale_id: '', first_name: '', last_name: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const selected = useMemo(() => employees.find((employee) => String(employee.id) === String(selectedId)) || null, [employees, selectedId]);

  const reload = useCallback(async () => {
    try {
      setData(await employeePinApi.list());
    } catch (error) {
      setMessage(error.message);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!selected) return;
    const fallback = String(selected.display_name || '').trim().split(/\s+/);
    setDraft({
      filiale_id: selected.filiale_id == null ? 'all' : String(selected.filiale_id),
      first_name: selected.first_name || fallback.shift() || '',
      last_name: selected.last_name || fallback.join(' '),
    });
  }, [selected]);

  const valid = Boolean(draft.filiale_id && draft.first_name.trim().length >= 2 && draft.last_name.trim().length >= 2);
  const run = async (action) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await action();
      await reload();
      setMessage(result?.message || 'Aktion erfolgreich.');
      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    const success = await run(() => employeePinApi.create(draft));
    if (success) setDraft({ filiale_id: draft.filiale_id, first_name: '', last_name: '' });
  };

  const save = () => run(() => employeePinApi.update(selectedId, draft));
  const resetPin = () => {
    if (!window.confirm(`${selected.display_name} wirklich auf den Standard-PIN 0000 zurücksetzen?`)) return;
    run(() => employeePinApi.reset(selectedId));
  };

  return <div className="space-y-5 text-white">
    <div className="rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4 text-sm text-amber-50">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0" size={21} /><div><strong>Fester Erstgebrauch:</strong> Jeder neu angelegte Mitarbeiter startet automatisch mit <strong>0000</strong>. Beim ersten Einsatz muss anschließend ein eigener vierstelliger PIN vergeben werden.</div></div>
    </div>

    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-2">
      <button type="button" onClick={() => { setMode('create'); setMessage(''); setDraft({ filiale_id: '', first_name: '', last_name: '' }); }} className={`min-h-14 rounded-xl px-3 font-black ${mode === 'create' ? 'bg-[#800000]' : 'hover:bg-white/10'}`}><Plus className="mr-2 inline" size={19} />Mitarbeiter anlegen</button>
      <button type="button" onClick={() => { setMode('edit'); setMessage(''); }} className={`min-h-14 rounded-xl px-3 font-black ${mode === 'edit' ? 'bg-[#800000]' : 'hover:bg-white/10'}`}><Pencil className="mr-2 inline" size={18} />Mitarbeiter bearbeiten</button>
    </div>

    {mode === 'create' && <section className="rounded-2xl border border-white/15 bg-white/5 p-4 sm:p-5">
      <h3 className="text-xl font-black">Neuen Mitarbeiter anlegen</h3>
      <p className="mt-1 text-sm text-white/55">Stammfiliale beziehungsweise „Alle“ sowie Vor- und Nachname sind Pflichtfelder. Diese Zuordnung schränkt den Einsatz nicht ein: Der persönliche PIN funktioniert in jeder Filiale.</p>
      <div className="mt-4"><EmployeeFields branches={branches} draft={draft} setDraft={setDraft} /></div>
      <button type="button" disabled={busy || !valid} onClick={create} className={`${primaryButton} mt-4 w-full sm:w-auto`}>{busy ? 'Wird angelegt …' : 'Mitarbeiter anlegen'}</button>
    </section>}

    {mode === 'edit' && <section className="rounded-2xl border border-white/15 bg-white/5 p-4 sm:p-5">
      <h3 className="text-xl font-black">Mitarbeiter bearbeiten</h3>
      <select className={`${fieldClass} mt-4 w-full`} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
        <option value="">Mitarbeiter auswählen</option>
        {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.filiale} · {employee.display_name}</option>)}
      </select>
      {selected && <>
        <div className="mt-4"><EmployeeFields branches={branches} draft={draft} setDraft={setDraft} /></div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button type="button" disabled={busy || !valid} onClick={save} className={primaryButton}>{busy ? 'Wird gespeichert …' : 'Änderungen speichern'}</button>
          <button type="button" disabled={busy} onClick={resetPin} className={secondaryButton}><RotateCcw className="mr-2 inline" size={18} />PIN auf 0000 zurücksetzen</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-white/10 px-3 py-1.5">Status: {selected.must_change_pin ? 'Erst-PIN noch offen' : 'Persönlicher PIN aktiv'}</span>
          {selected.last_used_at && <span className="rounded-full bg-white/10 px-3 py-1.5">Zuletzt verwendet: {new Date(selected.last_used_at).toLocaleString('de-DE')}</span>}
        </div>
      </>}
    </section>}

    {message && <div role="status" className="rounded-xl border border-white/15 bg-black/35 p-4 font-bold">{message}</div>}

    <section className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="mb-3 flex items-center gap-2"><KeyRound size={19} /><h3 className="font-black">Angelegte Mitarbeiter</h3></div>
      <div className="grid gap-2 md:grid-cols-2">
        {employees.map((employee) => <button type="button" key={employee.id} onClick={() => { setMode('edit'); setSelectedId(String(employee.id)); setMessage(''); }} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
          <div className="font-black">{employee.display_name}</div><div className="text-sm text-white/50">Zuordnung: {employee.filiale || 'Alle'} · {employee.must_change_pin ? 'Standard-PIN 0000' : 'Persönlicher PIN'}</div>
        </button>)}
        {!employees.length && <div className="text-sm text-white/45">Noch keine Mitarbeiter angelegt.</div>}
      </div>
    </section>
  </div>;
}
