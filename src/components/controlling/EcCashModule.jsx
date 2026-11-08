import { useState } from 'react';
import EcCashModal from './EcCashModal';
import EcCashV2Prototype from './EcCashV2Prototype';

const CLASSIC_VIEW = 'classic';
const V2_VIEW = 'v2';

function ViewSwitcher({ activeView, onChange }) {
  const isClassic = activeView === CLASSIC_VIEW;

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-2 text-white shadow-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={isClassic}
          onClick={() => onChange(CLASSIC_VIEW)}
          className={`rounded-lg border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-white/40 ${isClassic ? 'border-white/30 bg-white text-[#620000] shadow' : 'border-transparent bg-white/5 text-white/65 hover:bg-white/10 hover:text-white'}`}
        >
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] opacity-60">Standard beim Öffnen</span>
          <span className="mt-1 block text-sm font-black">Klassische Excel-Ansicht</span>
        </button>
        <button
          type="button"
          aria-pressed={!isClassic}
          onClick={() => onChange(V2_VIEW)}
          className={`rounded-lg border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-white/40 ${!isClassic ? 'border-white/30 bg-white text-[#620000] shadow' : 'border-transparent bg-white/5 text-white/65 hover:bg-white/10 hover:text-white'}`}
        >
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] opacity-60">Geführter Workflow</span>
          <span className="mt-1 block text-sm font-black">Neue V2-Ansicht</span>
        </button>
      </div>
      <div className="px-2 pb-1 pt-2 text-xs text-white/45">
        {isClassic ? 'Vertraute Tabellenansicht – Eingaben und Monatswerte wie bisher.' : 'Prüfen, zuordnen und bestätigen in drei klaren Schritten.'}
      </div>
      <span className="sr-only">
        {isClassic ? 'Zur V2-Ansicht wechseln' : 'Zur klassischen Ansicht wechseln'}
      </span>
    </div>
  );
}

export default function EcCashModule() {
  const [activeView, setActiveView] = useState(CLASSIC_VIEW);

  return (
    <div className="min-h-full">
      <ViewSwitcher activeView={activeView} onChange={setActiveView} />
      {activeView === CLASSIC_VIEW ? <EcCashModal /> : <EcCashV2Prototype />}
    </div>
  );
}
