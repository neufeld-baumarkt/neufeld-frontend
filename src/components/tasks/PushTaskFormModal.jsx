import React, { useEffect, useState } from 'react';
import { dateTimeLocalValue } from '../../lib/pushTaskUi.mjs';

const tomorrow = () => dateTimeLocalValue(new Date(Date.now() + 24 * 3600_000));

export default function PushTaskFormModal({ open, users, task, onClose, onSave, saving }) {
  const [form, setForm] = useState({ title:'',description:'',priority:'normal',proof_mode:'confirm',due_at:tomorrow(),assignee_user_ids:[] });
  useEffect(() => {
    if (!open) return;
    setForm(task ? { title:task.title,description:task.description,priority:task.priority,proof_mode:task.proof_mode,
      due_at:dateTimeLocalValue(task.due_at),assignee_user_ids:(task.assignments||[]).map((item)=>item.assignee_user_id) }
      : { title:'',description:'',priority:'normal',proof_mode:'confirm',due_at:tomorrow(),assignee_user_ids:[] });
  }, [open,task]);
  if (!open) return null;
  const toggle = (id) => setForm((current) => ({ ...current,assignee_user_ids:current.assignee_user_ids.includes(id) ? current.assignee_user_ids.filter((x)=>x!==id) : [...current.assignee_user_ids,id] }));
  const submit = (event) => { event.preventDefault(); onSave({ ...form,due_at:new Date(form.due_at).toISOString() }); };
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-2 sm:p-6" role="dialog" aria-modal="true">
    <form onSubmit={submit} className="max-h-[95vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-4 text-black shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[.18em] text-[#800000]">Pushtask Pilot</div><h2 className="text-2xl font-black">{task?'Task bearbeiten':'Neue Task'}</h2></div><button type="button" onClick={onClose} className="rounded-lg px-3 py-2 hover:bg-black/5">Schließen</button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">Titel<input required maxLength={160} value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} className="mt-1 w-full rounded-lg border p-3" /></label>
        <label className="sm:col-span-2">Beschreibung<textarea required maxLength={5000} rows={5} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="mt-1 w-full rounded-lg border p-3" /></label>
        <label>Fälligkeit<input required type="datetime-local" value={form.due_at} onChange={(e)=>setForm({...form,due_at:e.target.value})} className="mt-1 w-full rounded-lg border p-3" /></label>
        <label>Priorität<select value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value})} className="mt-1 w-full rounded-lg border p-3"><option value="normal">Normal</option><option value="high">Hoch</option><option value="critical">Kritisch</option></select></label>
        <label className="sm:col-span-2">Erforderlicher Nachweis<select value={form.proof_mode} onChange={(e)=>setForm({...form,proof_mode:e.target.value})} className="mt-1 w-full rounded-lg border p-3"><option value="confirm">Bestätigung</option><option value="photo">Foto</option><option value="both">Bestätigung und Foto</option></select></label>
        <fieldset className="sm:col-span-2"><legend className="font-semibold">Ausführende</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{users.map((user)=><label key={user.id} className="flex items-center gap-3 rounded-lg border p-3"><input type="checkbox" disabled={Boolean(task)} checked={form.assignee_user_ids.includes(user.id)} onChange={()=>toggle(user.id)} /><span>{user.name} <span className="text-black/50">({user.role})</span></span></label>)}</div></fieldset>
      </div>
      <div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm">Standard: Erinnerung 24 Stunden vorher, dringende E-Mail bei Fälligkeit, harte Eskalation 24 Stunden danach.</div>
      <button disabled={saving||!form.assignee_user_ids.length} className="mt-5 w-full rounded-xl bg-[#800000] px-5 py-3 font-bold text-white disabled:opacity-50">{saving?'Speichert…':'Verbindlich speichern'}</button>
    </form>
  </div>;
}
