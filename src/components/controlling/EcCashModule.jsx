import { useState } from 'react';
import EcCashModal from './EcCashModal';
import EcCashV2Prototype from './EcCashV2Prototype';

const CLASSIC_VIEW = 'classic';
const V2_VIEW = 'v2';

function ViewSwitcher({ activeView, onChange }) {
  const isClassic = activeView === CLASSIC_VIEW;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
          Darstellung
        </div>
        <div className="mt-1 text-sm font-bold text-white/75">
          {isClassic
            ? 'Klassische Excel-Ansicht'
            : 'Neue geführte V2-Ansicht'}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(isClassic ? V2_VIEW : CLASSIC_VIEW)}
        className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:border-white/35 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        {isClassic ? 'Zur V2-Ansicht wechseln' : 'Zur klassischen Ansicht wechseln'}
      </button>
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
