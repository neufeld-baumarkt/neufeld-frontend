// src/components/cashflow/CashflowWeekDetailModal.jsx

import { useState } from 'react';
import CashflowFastBookingModal from './CashflowFastBookingModal';
import CashflowCellDetailModal from './CashflowCellDetailModal';

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

  const hasOpenBooking = cellBuchungen.some(
    (buchung) => buchung.status === 'angekuendigt'
  );

  return {
    count: cellBuchungen.length,
    summe,
    hasOpenBooking,
  };
}

export default function CashflowWeekDetailModal({
  isOpen,
  onClose,
  jahr,
  week,
  buchungen = [],
  onReload,
}) {
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [fastBookingCell, setFastBookingCell] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [bookingAction, setBookingAction] = useState('');

  if (!isOpen || !week) return null;

  const einnahmenSumme = buchungen
    .filter((buchung) => Number(buchung.kategorie_id) === 1)
    .reduce((sum, buchung) => sum + Number(buchung.betrag || 0), 0);

  const ausgabenSumme = buchungen
    .filter((buchung) => Number(buchung.kategorie_id) !== 1)
    .reduce((sum, buchung) => sum + Number(buchung.betrag || 0), 0);

  const modalSaldo = einnahmenSumme - ausgabenSumme;

  const gebuchteEinnahmenMitForecast = buchungen.filter(
    (buchung) =>
      Number(buchung.kategorie_id) === 1 &&
      buchung.status === 'gebucht' &&
      buchung.planbetrag != null
  );

  const forecastPlanSumme = gebuchteEinnahmenMitForecast.reduce(
    (sum, buchung) => sum + Number(buchung.planbetrag || 0),
    0
  );

  const forecastIstSumme = gebuchteEinnahmenMitForecast.reduce(
    (sum, buchung) => sum + Number(buchung.betrag || 0),
    0
  );

  const forecastProzent =
    forecastPlanSumme > 0
      ? ((forecastIstSumme - forecastPlanSumme) / forecastPlanSumme) * 100
      : 0;

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

  const cellDetailBuchungen = selectedCell
  ? getCellBuchungen(
      buchungen,
      selectedCell.tag,
      selectedCell.kategorieId
    )
  : [];

  const closeModal = () => {
   setSelectedCell(null);
   setSelectedBooking(null);
   setFastBookingCell(null);
   setSearchValue('');
   setSearchResults(null);
   setSearchError('');
   setBookingAction('');
   onClose();
  };

  const closeFastBookingModal = () => {
   setFastBookingCell(null);
  };

  const runSearch = async (value = searchValue) => {
    const suchwert = String(value || '').trim();
    const token = sessionStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL;

    if (!suchwert) {
      setSearchResults(null);
      setSearchError('Bitte Avis- oder Rechnungsnummer eingeben.');
      return;
    }

    if (!baseUrl) {
      setSearchError('VITE_API_URL fehlt.');
      return;
    }

    if (!token) {
      setSearchError('Kein Login-Token vorhanden.');
      return;
    }

    setSearchLoading(true);
    setSearchError('');

    try {
      const response = await fetch(
        `${baseUrl}/api/cashflow/buchungen/suche?suchwert=${encodeURIComponent(suchwert)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || 'Suche konnte nicht ausgeführt werden.'
        );
      }

      setSearchResults(data);
    } catch (err) {
      setSearchResults(null);
      setSearchError(err.message || 'Fehler bei der Suche.');
    } finally {
      setSearchLoading(false);
    }
  };

  const openBookingFromSearch = (buchungId) => {
    const buchung = buchungen.find((item) => item.id === buchungId);

    if (!buchung) {
      setSearchError(
        'Die Buchung wurde gefunden, ist aber in der aktuell geladenen Wochenansicht nicht verfügbar.'
      );
      return;
    }

    setSelectedCell({
      tag: buchung.tag,
      kw: buchung.kw,
      kategorieId: buchung.kategorie_id,
      kategorieName: buchung.kategorie,
    });
    setSelectedBooking(buchung.id);
  };

  const bookSingleInvoice = async (buchungId) => {
    const token = sessionStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL;

    if (!baseUrl) {
      setSearchError('VITE_API_URL fehlt.');
      return;
    }

    if (!token) {
      setSearchError('Kein Login-Token vorhanden.');
      return;
    }

    setBookingAction(`rechnung:${buchungId}`);
    setSearchError('');

    try {
      const response = await fetch(
        `${baseUrl}/api/cashflow/buchungen/${buchungId}/buchen`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Rechnung konnte nicht gebucht werden.');
      }

      if (typeof onReload === 'function') {
        await onReload();
      }

      await runSearch(searchValue);
    } catch (err) {
      setSearchError(err.message || 'Fehler beim Buchen der Rechnung.');
    } finally {
      setBookingAction('');
    }
  };

  const bookAvis = async (avisNummer) => {
    const token = sessionStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL;

    if (!baseUrl) {
      setSearchError('VITE_API_URL fehlt.');
      return;
    }

    if (!token) {
      setSearchError('Kein Login-Token vorhanden.');
      return;
    }

    setBookingAction(`avis:${avisNummer}`);
    setSearchError('');

    try {
      const response = await fetch(
        `${baseUrl}/api/cashflow/avis/${encodeURIComponent(avisNummer)}/buchen`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Avis konnte nicht gebucht werden.');
      }

      if (typeof onReload === 'function') {
        await onReload();
      }

      await runSearch(searchValue);
    } catch (err) {
      setSearchError(err.message || 'Fehler beim Buchen des Avis.');
    } finally {
      setBookingAction('');
    }
  };

const saveFastBooking = async (payload) => {
  try {
    const token = sessionStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL;

    const response = await fetch(`${baseUrl}/api/cashflow/buchungen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Fehler beim Speichern');
    }

    console.log('Cashflow gespeichert:', data);

    setFastBookingCell(null);

    if (typeof onReload === 'function') {
      await onReload();
    }
  } catch (err) {
    console.error(err);
    alert(err.message || 'Fehler beim Speichern');
  }
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
              <div className="flex items-center gap-3 mt-2">
                <div className="text-xl font-bold">
                  {formatEuro(einnahmenSumme)}
                </div>
                <div
                  className={`text-sm font-bold ${
                    forecastProzent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {forecastProzent > 0 ? '+' : ''}
                  {forecastProzent.toFixed(2)} %
                </div>
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-white/60 text-sm">Ausgaben</div>
              <div className="text-xl font-bold mt-2">
                {formatEuro(ausgabenSumme)}
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-white/60 text-sm">Saldo</div>
              <div
                className={`text-xl font-bold mt-2 ${
                  modalSaldo >= 0 ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                {formatEuro(modalSaldo)}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <label className="sr-only">
                  Avis- oder Rechnungsnummer
                </label>
                <input
                  type="text"
                  value={searchValue}
                  disabled={searchLoading || !!bookingAction}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      runSearch();
                    }
                  }}
                  placeholder="Avis- oder Rechnungsnummer"
                  className="w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:border-cyan-300/60 disabled:opacity-50"
                />
              </div>

              <button
                type="button"
                disabled={searchLoading || !!bookingAction}
                onClick={() => runSearch()}
                className="shrink-0 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-sm text-cyan-100 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searchLoading ? 'Suche...' : 'Suchen'}
              </button>
            </div>

            {searchError && (
              <div className="mt-2 text-sm text-red-300">{searchError}</div>
            )}

            {searchResults && (
              <div className="mt-3 max-h-[260px] overflow-auto pr-1 space-y-3">
                <div className="text-sm text-white/60">
                  {searchResults.anzahl_treffer === 1
                    ? '1 Treffer'
                    : `${searchResults.anzahl_treffer} Treffer`}
                </div>

                {searchResults.anzahl_treffer === 0 && (
                  <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/50">
                    Keine passende Avis- oder Rechnungsnummer gefunden.
                  </div>
                )}

                {searchResults.avis?.map((avis) => (
                  <div
                    key={`avis-${avis.avis_nummer}`}
                    className="rounded-xl border border-white/10 bg-black/25 p-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="text-white font-bold">
                          Avis {avis.avis_nummer}
                        </div>
                        <div className="text-white/55 text-sm mt-1">
                          {avis.anzahl_rechnungen} Rechnung
                          {avis.anzahl_rechnungen === 1 ? '' : 'en'} ·{' '}
                          {formatEuro(avis.gesamtsumme)} · Status: {avis.status}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={
                          avis.status === 'gebucht' ||
                          searchLoading ||
                          !!bookingAction
                        }
                        onClick={() => bookAvis(avis.avis_nummer)}
                        className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-sm text-emerald-100 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bookingAction === `avis:${avis.avis_nummer}`
                          ? 'Avis wird gebucht...'
                          : avis.status === 'gebucht'
                            ? 'Avis gebucht'
                            : 'Avis vollständig buchen'}
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {avis.rechnungen.map((rechnung) => (
                        <div
                          key={`avis-rechnung-${rechnung.id}`}
                          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2"
                        >
                          <div>
                            <div className="text-white font-semibold">
                              {rechnung.rechnungsnummer || 'Ohne Rechnungsnummer'}
                            </div>
                            <div className="text-white/50 text-xs mt-1">
                              {rechnung.kategorie} · {rechnung.filiale} ·{' '}
                              {formatEuro(rechnung.betrag)} · {rechnung.status}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={searchLoading || !!bookingAction}
                              onClick={() => openBookingFromSearch(rechnung.id)}
                              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition disabled:opacity-50"
                            >
                              Bearbeiten
                            </button>

                            <button
                              type="button"
                              disabled={
                                rechnung.status === 'gebucht' ||
                                searchLoading ||
                                !!bookingAction
                              }
                              onClick={() => bookSingleInvoice(rechnung.id)}
                              className="px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-100 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {bookingAction === `rechnung:${rechnung.id}`
                                ? 'Wird gebucht...'
                                : rechnung.status === 'gebucht'
                                  ? 'Gebucht'
                                  : 'Rechnung buchen'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {searchResults.rechnungen?.map((rechnung) => (
                  <div
                    key={`rechnung-${rechnung.id}`}
                    className="rounded-xl border border-white/10 bg-black/25 p-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3"
                  >
                    <div>
                      <div className="text-white font-bold">
                        Rechnung {rechnung.rechnungsnummer}
                      </div>
                      <div className="text-white/55 text-sm mt-1">
                        {rechnung.avis_nummer
                          ? `Avis ${rechnung.avis_nummer} · `
                          : ''}
                        {rechnung.kategorie} · {rechnung.filiale} ·{' '}
                        {formatEuro(rechnung.betrag)} · {rechnung.status}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={searchLoading || !!bookingAction}
                        onClick={() => openBookingFromSearch(rechnung.id)}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition disabled:opacity-50"
                      >
                        Bearbeiten
                      </button>

                      <button
                        type="button"
                        disabled={
                          rechnung.status === 'gebucht' ||
                          searchLoading ||
                          !!bookingAction
                        }
                        onClick={() => bookSingleInvoice(rechnung.id)}
                        className="px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-100 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bookingAction === `rechnung:${rechnung.id}`
                          ? 'Wird gebucht...'
                          : rechnung.status === 'gebucht'
                            ? 'Gebucht'
                            : 'Rechnung buchen'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
  			 jahr,
  			 kw: week.kw,
  			 tag,
  			 kategorieId: kategorie.id,
  			 kategorieName: kategorie.name,
  			 isEinnahme: Number(kategorie.id) === 1,
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
                            <div
  			className={`font-bold ${
    			 cell.hasOpenBooking ? 'text-orange-300' : 'text-white'
  			}`}
		      >
  			{formatEuro(cell.summe)}
		      </div>

                            {cell.count > 0 && (
  			      <div className="flex items-center justify-between mt-1">
    			<div className={`text-xs font-bold ${
                  cell.hasOpenBooking
                    ? 'text-orange-300'
                    : 'text-white/70'
                }`}>
                  {Number(kategorie.id) === 1
                    ? (cell.hasOpenBooking
                        ? 'Geplant'
                        : (() => {
                            const forecastBuchungen = getCellBuchungen(
                              buchungen,
                              tag,
                              kategorie.id
                            ).filter(
                              (buchung) =>
                                buchung.status === 'gebucht' &&
                                buchung.planbetrag != null
                            );

                            const planSumme = forecastBuchungen.reduce(
                              (sum, buchung) =>
                                sum + Number(buchung.planbetrag || 0),
                              0
                            );

                            const istSumme = forecastBuchungen.reduce(
                              (sum, buchung) =>
                                sum + Number(buchung.betrag || 0),
                              0
                            );

                            const prozent =
                              planSumme > 0
                                ? ((istSumme - planSumme) / planSumme) * 100
                                : 0;

                            return `${prozent > 0 ? '+' : ''}${prozent.toFixed(2)} %`;
                          })())
                    : `${cell.count} Buchungen`}
                </div>

    			<button
      			 type="button"
      			 onClick={(e) => {
        		  e.stopPropagation();

        		  setSelectedCell({
          		  tag,
          		  kw: week.kw,
          		  kategorieId: kategorie.id,
          		  kategorieName: kategorie.name,
        		});
      		      }}
      		      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-xl leading-none font-bold text-cyan-200 hover:text-white transition shadow-[0_0_0_1px_rgba(103,232,249,0.22)]"
    		    >
      		      +
    		    </button>
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

		<CashflowCellDetailModal
  		 isOpen={!!selectedCell}
  		  cell={selectedCell}
  		  buchungen={cellDetailBuchungen}
		  onReload={onReload}
 		  onClose={() => {
   		  setSelectedCell(null);
    		  setSelectedBooking(null);
  		  }}
		/>

		<CashflowFastBookingModal
  		 isOpen={!!fastBookingCell}
  		 context={fastBookingCell}
  		 onClose={closeFastBookingModal}
  		 onMockSave={saveFastBooking}
	   />

        </div>
      </div>
    </div>
  );
}