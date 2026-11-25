import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function WeekPicker({ week, onChange, loading = false }) {
  return (
    <div className="flex items-center justify-between gap-1">
      <button type="button" className="p-2 disabled:opacity-40" onClick={() => onChange(week.previous)} disabled={loading} aria-label="Vorherige Kalenderwoche"><ChevronLeft size={16} /></button>
      <p className="text-sm font-bold" aria-live="polite">KW {week.week} · {week.year}</p>
      <button type="button" className="p-2 disabled:opacity-40" onClick={() => onChange(week.next)} disabled={loading} aria-label="Nächste Kalenderwoche"><ChevronRight size={16} /></button>
    </div>
  );
}
