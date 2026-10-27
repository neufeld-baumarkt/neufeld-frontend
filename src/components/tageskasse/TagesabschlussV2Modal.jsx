import { useMemo, useState } from 'react';
import {
  Banknote,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Landmark,
  LockKeyhole,
  Monitor,
  ShieldCheck,
  X,
} from 'lucide-react';
import { formatEuroFromCents } from '../../lib/kasseneinzaehlung.mjs';
import { buildDayCloseV2ViewModel } from '../../lib/tagesabschlussV2.mjs';

const dateTime = (value) => value
  ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Noch nicht gezählt';

const typeLabel = (value) => ({ morning: 'Morgenzählung', handover: 'Schichtübergabe', closing: 'Abendzählung' }[value] || 'Tresorzählung');

const groupIcons = {
  Vorbereitung: Banknote,
  'Am PC': Monitor,
  'Am Tresor': Landmark,
  Abschluss: ShieldCheck,
};

function MoneyValue({ cents, empty = 'Noch nicht erfasst' }) {
  return <strong className="mt-1 block text-2xl sm:text-3xl">{Number.isInteger(cents) ? formatEuroFromCents(cents) : empty}</strong>;
}

function SummaryCard({ label, children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-black/10 bg-white',
    amber: 'border-amber-300 bg-amber-50 text-amber-950',
    green: 'border-emerald-300 bg-emerald-50 text-emerald-950',
  };
  return <div className={`rounded-2xl border-2 p-4 ${tones[tone]}`}>
    <span className="text-xs font-black uppercase tracking-wide opacity-50">{label}</span>
    {children}
  </div>;
}

function ProcessCard({ process, onStart, infoOpen, onToggleInfo }) {
  const Icon = groupIcons[process.group] || Check;
  const completed = process.status === 'completed';
  const inProgress = process.status === 'in_progress';
  const locked = process.status === 'locked';
  const action = completed ? 'Ansehen' : inProgress ? 'Fortsetzen' : locked ? 'Noch nicht möglich' : 'Starten';
  return <div className={`rounded-2xl border-2 p-4 ${completed ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : inProgress ? 'border-amber-300 bg-amber-50 text-amber-950' : locked ? 'border-black/10 bg-black/[.035] text-black/45' : 'border-black/10 bg-white'}`}>
    <div className="flex items-start gap-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${completed ? 'bg-emerald-600 text-white' : inProgress ? 'bg-amber-400 text-amber-950' : locked ? 'bg-black/10' : 'bg-[#800000] text-white'}`}>
        {completed ? <CheckCircle2 size={23}/> : locked ? <LockKeyhole size={22}/> : <Icon size={22}/>} 
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div><span className="text-xs font-black uppercase tracking-wide opacity-50">{process.group}</span><h4 className="text-lg font-black">{process.title}</h4></div>
          <button type="button" onClick={onToggleInfo} className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-black/5" aria-label={`Information zu ${process.title}`} aria-expanded={infoOpen}><CircleHelp size={21}/></button>
        </div>
        {infoOpen&&<div className="mt-2 rounded-xl bg-black/[.055] p-3 text-sm font-bold">{process.description}</div>}
        {completed&&process.completedAt&&<div className="mt-2 text-sm opacity-65">Erledigt {dateTime(process.completedAt)}{process.completedBy ? ` · ${process.completedBy}` : ''}</div>}
        {locked&&<div className="mt-2 text-sm font-bold">Vorherige Pflichtschritte fehlen noch.</div>}
      </div>
    </div>
    <button type="button" disabled={locked} onClick={()=>onStart?.(process)} className={`mt-4 min-h-11 w-full rounded-xl px-4 font-black ${completed ? 'border-2 border-emerald-700 bg-white text-emerald-800' : inProgress ? 'bg-amber-400 text-amber-950' : 'bg-[#800000] text-white'} disabled:bg-black/10 disabled:text-black/35`}>{action}</button>
  </div>;
}

export default function TagesabschlussV2Modal({ branch, businessDate, context, onStartProcess, onStartLegacy, onClose }) {
  const [openInfo, setOpenInfo] = useState('');
  const model = useMemo(() => buildDayCloseV2ViewModel(context), [context]);
  const groups = [...new Set(model.processes.map((process) => process.group))];
  const safe = model.summary.latestSafeCount;
  const bankFinal = model.summary.bankPayoutStatus === 'final';

  return <div className="fixed inset-0 z-[115] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="day-close-v2-title">
    <section className="flex max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-[#f7f4ef] text-black shadow-2xl sm:max-h-[94dvh] sm:rounded-3xl">
      <header className="flex items-center justify-between bg-[#800000] px-5 py-4 text-white">
        <div><div className="text-xs font-bold uppercase tracking-[.2em] text-white/65">Tageskassenabrechnung · DEV</div><h2 id="day-close-v2-title" className="text-2xl font-black">Tagesabrechnung</h2></div>
        <button type="button" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="Schließen"><X/></button>
      </header>

      <div className="overflow-y-auto p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white px-3 py-1.5">Filiale: {branch}</span><span className="rounded-full bg-white px-3 py-1.5">Geschäftstag: {businessDate}</span></div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Gesamt Bar an Bank" tone={bankFinal ? 'green' : 'amber'}><MoneyValue cents={model.summary.bankPayoutCents}/><span className="mt-1 block text-sm font-bold opacity-60">{bankFinal ? 'Verbindlich' : 'Vorläufig'}</span></SummaryCard>
          <SummaryCard label="Entnommenes Kleingeld"><MoneyValue cents={model.summary.looseChangeCents}/><span className="mt-1 block text-sm opacity-55">Aus {model.summary.closingCount} Kassen</span></SummaryCard>
          <SummaryCard label="Tresor IST · zuletzt gezählt"><MoneyValue cents={safe?.countedTotalCents} empty="Noch nicht gezählt"/><span className="mt-1 block text-sm opacity-55">{safe ? `${typeLabel(safe.countType)} · ${dateTime(safe.completedAt)}` : 'Keine Zählung vorhanden'}</span></SummaryCard>
          <SummaryCard label="Tresor SOLL"><MoneyValue cents={model.summary.eurocontrolSafeTargetCents}/><span className="mt-1 block text-sm opacity-55">{Number.isInteger(model.summary.eurocontrolSafeTargetCents) ? 'Aus EuroControl' : 'Noch nicht übertragen'}</span></SummaryCard>
          <SummaryCard label="Fortschritt" tone={model.progress.percent === 100 ? 'green' : 'neutral'}><strong className="mt-1 block text-2xl sm:text-3xl">{model.progress.completed} von {model.progress.required}</strong><span className="mt-1 block text-sm font-bold opacity-60">{model.progress.percent} % abgeschlossen</span><div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-label="Fortschritt der Tagesabrechnung" aria-valuenow={model.progress.percent} aria-valuemin="0" aria-valuemax="100"><div className="h-full bg-emerald-600" style={{width:`${model.progress.percent}%`}}/></div></SummaryCard>
        </div>

        <div className="mt-7 space-y-6">
          {groups.map((group)=><section key={group}><div className="mb-3 flex items-center gap-2"><Clock3 size={18} className="text-[#800000]"/><h3 className="text-lg font-black">{group}</h3></div><div className="grid gap-3 md:grid-cols-2">{model.processes.filter((process)=>process.group===group).map((process)=><ProcessCard key={process.id} process={process} onStart={onStartProcess} infoOpen={openInfo===process.id} onToggleInfo={()=>setOpenInfo((current)=>current===process.id?'':process.id)}/>)}</div></section>)}
        </div>

        <div className="mt-8 border-t border-black/10 pt-5 text-center"><button type="button" onClick={onStartLegacy} className="min-h-11 rounded-xl border-2 border-black/15 bg-white px-5 font-bold text-black/65">Bisherigen Tagesabschluss starten</button><p className="mt-2 text-xs text-black/40">DEV-Rückfallebene · der bisherige Ablauf bleibt unverändert</p></div>
      </div>
    </section>
  </div>;
}

