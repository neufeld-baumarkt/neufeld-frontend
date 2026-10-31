import { AlertTriangle, Check, Cloud, LoaderCircle } from 'lucide-react';

export function WorkflowDraftStatus({ status, lastSavedAt }) {
  const config = {
    idle: [Cloud, 'Noch keine Eingabe'],
    pending: [LoaderCircle, 'Speicherung vorgemerkt'],
    saving: [LoaderCircle, 'Wird in der DB gespeichert …'],
    saved: [Check, lastSavedAt ? `Gespeichert · ${new Date(lastSavedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'In der DB gespeichert'],
    error: [AlertTriangle, 'Nicht gespeichert – Verbindung prüfen'],
  }[status] || [Cloud, 'Entwurfsstatus unbekannt'];
  const [Icon, label] = config;
  return <div className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${status==='error'?'border-red-300 bg-red-50 text-red-800':'border-black/10 bg-white text-black/55'}`}><Icon size={17} className={status==='saving'||status==='pending'?'animate-spin':''}/>{label}</div>;
}

export function WorkflowDraftResume({ title, description, savedAt, busy, onContinue, onDiscard }) {
  return <div className="mx-auto max-w-2xl text-center"><AlertTriangle className="mx-auto text-amber-600" size={60}/><h3 className="mt-4 text-2xl font-black">Angefangener Prozess vorhanden</h3><p className="mt-2 text-black/60">{title}{description?` · ${description}`:''}</p>{savedAt&&<p className="mt-2 text-sm font-bold text-black/45">Zuletzt gespeichert: {new Date(savedAt).toLocaleString('de-DE')}</p>}<p className="mt-5 font-bold">Möchtest du fortfahren?</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" disabled={busy} onClick={onDiscard} className="min-h-12 rounded-xl border-2 border-black/15 bg-white px-5 font-black disabled:opacity-40">Nein – verwerfen</button><button type="button" disabled={busy} onClick={onContinue} className="min-h-12 rounded-xl bg-[#800000] px-5 font-black text-white disabled:opacity-40">Ja – fortfahren</button></div></div>;
}
