// src/components/cashflow/AlexCashflowHub.jsx

import { useState } from 'react';
import AlexSidebarKeys from './AlexSidebarKeys';
import CashflowWeekGrid from './CashflowWeekGrid';

const MODULES = [
  {
    id: 'einnahmenAusgaben',
    title: 'Einnahmen / Ausgaben',
    subtitle: 'Wochenmatrix · Cashflow',
  },
  {
    id: 'umsatzplanung',
    title: 'Umsatzplanung',
    subtitle: 'Soll / Ist · Filialen',
  },
  {
    id: 'liquiditaet',
    title: 'Liquidität',
    subtitle: 'In Vorbereitung',
  },
  {
    id: 'prognosen',
    title: 'Prognosen',
    subtitle: 'In Vorbereitung',
  },
  {
    id: 'jahresplanung',
    title: 'Jahresplanung',
    subtitle: 'In Vorbereitung',
  },
  {
    id: 'sonstiges',
    title: 'Sonstiges',
    subtitle: 'In Vorbereitung',
  },
];

export default function AlexCashflowHub({
  jahr,
  bisKw,
  weeksData = [],
  buchungen = [],
  cashflowLoading = false,
  cashflowError = '',
  onReload,
}) {
  const [activeId, setActiveId] = useState(MODULES[0].id);
  const [openId, setOpenId] = useState(null);

  const activeModule =
    MODULES.find((module) => module.id === activeId) || MODULES[0];

  const openModule =
    MODULES.find((module) => module.id === openId) || null;

  return (
    <div className="w-full h-full flex gap-8">
      <div className="pt-4">
        <AlexSidebarKeys
          modules={MODULES}
          activeId={activeId}
          onChange={setActiveId}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-white/10 border border-white/10 rounded-2xl p-8 shadow-[6px_6px_18px_rgba(0,0,0,0.45)]">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <div className="text-white/60 text-sm font-bold tracking-[0.25em] uppercase">
                Alex-Modul
              </div>

              <div className="text-3xl font-bold text-white mt-2">
                {activeModule.title}
              </div>

              <div className="text-white/60 mt-1">
                {activeModule.subtitle}
              </div>
            </div>

            <div className="text-right text-white/60 text-sm">
              Jahr {jahr} · bis KW {bisKw}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpenId(activeModule.id)}
            className="w-full text-left rounded-2xl border border-white/10 bg-[#2f2d2d] hover:bg-[#343131] transition shadow-[6px_6px_18px_rgba(0,0,0,0.45)] overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between gap-4">
              <div>
                <div className="text-xl font-bold text-white">
                  Vorschau
                </div>
                <div className="text-white/50 text-sm mt-1">
                  Klick auf die Vorschau öffnet das Modul.
                </div>
              </div>

              <div className="px-4 py-2 rounded-lg bg-[#800000] text-white font-bold shadow">
                Öffnen
              </div>
            </div>

            <div className="p-6">
              {activeModule.id === 'einnahmenAusgaben' ? (
                <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
                  <div className="grid grid-cols-9 text-xs font-bold text-white/75">
                    {[
                      'Tag',
                      'Einnahmen',
                      'Wareneinsatz',
                      'Kosten',
                      'Büro',
                      'Lohn',
                      'Fuhrpark',
                      'Steuern',
                      'Stadt',
                    ].map((headline) => (
                      <div
                        key={headline}
                        className="bg-black/40 border-r border-b border-white/10 px-2 py-2 truncate"
                      >
                        {headline}
                      </div>
                    ))}

                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((tag) => (
                      <>
                        <div
                          key={`${tag}-label`}
                          className="bg-black/25 border-r border-b border-white/10 px-2 py-3 text-white"
                        >
                          {tag}
                        </div>

                        {Array.from({ length: 8 }, (_, index) => (
                          <div
                            key={`${tag}-${index}`}
                            className={`border-r border-b border-white/10 px-2 py-3 ${
                              index === 0 && tag !== 'So'
                                ? 'bg-white/10 text-white/80'
                                : 'bg-black/10 text-white/25'
                            }`}
                          >
                            {index === 0 && tag !== 'So' ? '€' : '–'}
                          </div>
                        ))}
                      </>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[340px] rounded-xl border border-white/10 bg-black/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {activeModule.title}
                    </div>
                    <div className="text-white/50 mt-3">
                      Dieses Alex-Modul ist vorbereitet.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {openModule && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpenId(null);
            }
          }}
        >
          <div className="w-screen h-screen bg-[#2f2d2d] border border-white/10 shadow-[6px_6px_18px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-bold text-white">
                  {openModule.title}
                </div>

                <div className="text-white/60 text-sm mt-1">
                  {openModule.subtitle}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
              >
                Schließen
              </button>
            </div>

            <div className="p-6 overflow-auto h-[calc(100vh-100px)]">
              {openModule.id === 'einnahmenAusgaben' ? (
                <>
                  {cashflowError && (
                    <div className="mb-4 rounded-xl bg-red-900/40 border border-red-400/30 px-4 py-3 text-red-100">
                      {cashflowError}
                    </div>
                  )}

                  {cashflowLoading && weeksData.length === 0 ? (
                    <div className="text-center text-white/60 py-12">
                      Lade Wochenübersicht…
                    </div>
                  ) : (
                    <CashflowWeekGrid
                      jahr={jahr}
                      weeks={weeksData}
                      buchungen={buchungen}
                      onReload={onReload}
                    />
                  )}
                </>
              ) : (
                <div className="text-white/60">
                  Dieses Alex-Modul folgt später.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}