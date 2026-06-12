// src/components/cashflow/CashflowWeekDetailModal.jsx

import { useState } from 'react';
import CashflowFastBookingModal from './CashflowFastBookingModal';

function formatEuro(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const KATEGORIEN = [
  { id: 1, name: 'Einnahmen' },
  { id: 2, name: 'Wareneinsatz/Werbung' },
  { id: 3, name: 'Kosten/Geräte' },
  { id: 4, name: 'Sonstige/Büro' },
  { id: 5, name: 'Lohn/Nebenkosten' },
  { id: 6, name: 'Fuhrpark Leasing' },
  { id: 7, name: 'Steuern/Zinsen/Tilgung' },
  { id: 8, name: 'Stadt - Strom+Gas' },
];

function getCellBuchungen(buchungen, tag, kategorieId) {
  return buchungen.filter(
    (buchung) =>
      buchung.tag === tag &&
      Number(buchung.kategorie_id) === Number(kategorieId)
  );
}

function getCellData(buchungen, tag, kategorieId) {
  const cellBuchungen = getCellBuchungen(buchungen, tag, kategorieId);

  const summe = cellBuchungen.reduce(
    (total, buchung) => total + Number(buchung.betrag || 0),
    0
  );

  return {
    count: cellBuchungen.length,
    summe,
  };
}

export default function CashflowWeekDetailModal({
  isOpen,
  onClose,
  week,
  buchungen = [],
}) {
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [fastBookingCell, setFastBookingCell] = useState(null);

  if (!isOpen || !week) return null;

  const saldo = Number(week.saldo || 0);

  const selectedBuchungen = selectedCell
    ? getCellBuchungen(
        buchungen,
        selectedCell.tag,
        selectedCell.kategorieId
      )
    : [];

  const selectedSumme = selectedBuchungen.reduce(
    (total, buchung) => total + Number(buchung.betrag || 0),
    0
  );

  const closeModal = () => {
   setSelectedCell(null);
   setSelectedBooking(null);
   onClose();
  };

  const closeFastBookingModal = () => {
   setFastBookingCell(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 px-4 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
    >
      <div className="w-full max-w-[1500px] max-h-[90vh] bg-[#2f2d2d] rounded-2xl border border-white/10 shadow-[6px_6px_18px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-3xl font-bold text-white">
                KW {week.kw}
              </div>

              <div className="text-white/60 mt-2">
                Wochenmatrix · {buchungen.length} Buchungen
              </div>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              Schließen
            </button>
          </div>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(90vh-110px)]">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-white/60 text-sm">Einnahmen</div>
              <div className="text-xl font-bold mt-2">
                {formatEuro(week.einnahmen)}
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-white/60 text-sm">Ausgaben</div>
              <div className="text-xl font-bold mt-2">
                {formatEuro(week.ausgaben)}
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-white/60 text-sm">Saldo</div>
              <div
                className={`text-xl font-bold mt-2 ${
                  saldo >= 0 ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                {formatEuro(week.saldo)}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 overflow-auto">
            <div
              className="grid min-w-[1250px]"
              style={{
                gridTemplateColumns: `90px repeat(${KATEGORIEN.length}, minmax(130px, 1fr))`,
              }}
            >
              <div className="bg-black/40 border-r border-b border-white/10 px-3 py-3 font-bold text-white/80">
                Tag
              </div>

              {KATEGORIEN.map((kategorie) => (
                <div
                  key={kategorie.id}
                  className="bg-black/40 border-r border-b border-white/10 px-3 py-3 text-sm font-bold text-white/80"
                >
                  {kategorie.name}
                </div>
              ))}

              {WOCHENTAGE.map((tag) => (
                <>
                  <div
                    key={`${tag}-label`}
                    className="bg-black/25 border-r border-b border-white/10 px-3 py-4 font-bold text-white"
                  >
                    {tag}
                  </div>

                  {KATEGORIEN.map((kategorie) => {
                    const cell = getCellData(buchungen, tag, kategorie.id);
                    const hasValue = cell.count > 0;
                    const isSelected =
                      selectedCell?.tag === tag &&
                      Number(selectedCell?.kategorieId) === Number(kategorie.id);

                    return (
                      <button
  			key={`${tag}-${kategorie.id}`}
  			type="button"
  			onClick={() => {
    			setFastBookingCell({
      			jahr: week.jahr,
      			kw: week.kw,
      			tag,
      			kategorieId: kategorie.id,
      			kategorieName: kategorie.name,
    		   });
                }}
  		onDoubleClick={() => {
    		if (!hasValue) return;

    		setSelectedCell({
      		tag,
      		kategorieId: kategorie.id,
      		kategorieName: kategorie.name,
    		});

    		setSelectedBooking(null);
  		}}
                        className={`min-h-[72px] border-r border-b border-white/10 px-3 py-3 text-left transition ${
                          hasValue
                            ? isSelected
                              ? 'bg-white/25 ring-2 ring-white/30 cursor-pointer'
                              : 'bg-white/10 hover:bg-white/20 cursor-pointer'
                            : 'bg-black/10 cursor-default'
                        }`}
                      >
                        {hasValue ? (
                          <div>
                            <div className="font-bold text-white">
                              {formatEuro(cell.summe)}
                            </div>

                            {cell.count > 1 && (
                              <div className="text-xs text-white/55 mt-1">
                                {cell.count} Buchungen
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-white/20">–</div>
                        )}
                      </button>
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          {selectedCell && (
            <div className="mt-6 rounded-xl border border-white/10 bg-black/25 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold text-white">
                    {selectedCell.tag} · {selectedCell.kategorieName}
                  </div>
                  <div className="text-white/60 mt-1">
                    {selectedBuchungen.length} Buchung
                    {selectedBuchungen.length === 1 ? '' : 'en'} · Summe {formatEuro(selectedSumme)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCell(null);
                    setSelectedBooking(null);
                  }}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                >
                  Auswahl löschen
                </button>
              </div>

              <div className="divide-y divide-white/10">
                {selectedBuchungen.map((buchung) => {
                  const isSelected = selectedBooking?.id === buchung.id;

                  return (
                    <button
                      key={buchung.id}
                      type="button"
                      onClick={() => setSelectedBooking(buchung)}
                      className={`w-full text-left grid grid-cols-12 gap-3 px-5 py-4 transition ${
                        isSelected ? 'bg-white/15' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="col-span-2">
                        <div className="text-white/50 text-xs">Tag</div>
                        <div className="font-semibold">{buchung.tag}</div>
                      </div>

                      <div className="col-span-4">
                        <div className="text-white/50 text-xs">Kategorie</div>
                        <div className="font-semibold">{buchung.kategorie}</div>
                      </div>

                      <div className="col-span-2 text-right">
                        <div className="text-white/50 text-xs">Betrag</div>
                        <div className="font-bold">{formatEuro(buchung.betrag)}</div>
                      </div>

                      <div className="col-span-2">
                        <div className="text-white/50 text-xs">Quelle</div>
                        <div className="font-semibold truncate">
                          {buchung.quelle || '—'}
                        </div>
                      </div>

                      <div className="col-span-2 text-right">
                        <div className="text-white/50 text-xs">Zeile</div>
                        <div className="font-semibold">
                          {buchung.quelle_zeile || '—'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedBooking && (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold text-white">
                    Buchungsdetails
                  </div>
                  <div className="text-white/60 mt-1">
                    ID: {selectedBooking.id}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                >
                  Details schließen
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Jahr</div>
                  <div className="font-bold mt-1">{selectedBooking.jahr}</div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">KW</div>
                  <div className="font-bold mt-1">{selectedBooking.kw}</div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Tag</div>
                  <div className="font-bold mt-1">{selectedBooking.tag || '—'}</div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Kategorie</div>
                  <div className="font-bold mt-1">{selectedBooking.kategorie}</div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Typ</div>
                  <div className="font-bold mt-1">{selectedBooking.typ}</div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Betrag</div>
                  <div className="font-bold mt-1">{formatEuro(selectedBooking.betrag)}</div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Quelle</div>
                  <div className="font-bold mt-1">{selectedBooking.quelle || '—'}</div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Quelle Zeile</div>
                  <div className="font-bold mt-1">{selectedBooking.quelle_zeile || '—'}</div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Erstellt von</div>
                  <div className="font-bold mt-1">{selectedBooking.erstellt_von || '—'}</div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Erstellt am</div>
                  <div className="font-bold mt-1">
                    {formatDateTime(selectedBooking.erstellt_am)}
                  </div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Geändert am</div>
                  <div className="font-bold mt-1">
                    {formatDateTime(selectedBooking.geaendert_am)}
                  </div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-white/50 text-sm">Datum</div>
                  <div className="font-bold mt-1">{selectedBooking.datum || '—'}</div>
                </div>
              </div>
            </div>
          )}

	<CashflowFastBookingModal
  	  isOpen={!!fastBookingCell}
  	  context={fastBookingCell}
  	  onClose={closeFastBookingModal}
  	  onMockSave={(payload) => {
    	   console.log('Mock Save erfolgreich:', payload);
  	  }}
	/>

        </div>
      </div>
    </div>
  );
}