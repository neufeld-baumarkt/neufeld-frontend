// src/components/controlling/EcCashModal.jsx

import { useEffect, useRef, useState } from 'react';
import MoneyCell from './MoneyCell';
import {
  createCellKey,
  focusRegisteredCell,
  getNextCellKey,
} from './excelNavigation';

const YEAR = 2026;

const MONTHS_2026 = [
  { value: 1, label: "Jan'26" },
  { value: 2, label: "Feb'26" },
  { value: 3, label: "März'26" },
  { value: 4, label: "Apr'26" },
  { value: 5, label: "Mai'26" },
  { value: 6, label: "Juni'26" },
  { value: 7, label: "Juli'26" },
  { value: 8, label: "Aug'26" },
  { value: 9, label: "Sep'26" },
  { value: 10, label: "Okt'26" },
  { value: 11, label: "Nov'26" },
  { value: 12, label: "Dez'26" },
];

const BRANCH_COLUMNS = [
  { key: 'Telgte', label: 'Telgte' },
  { key: 'Ahaus', label: 'Ahaus' },
  { key: 'Vreden', label: 'Vreden' },
  { key: 'Münster', label: 'Münster' },
];

const MONEY_COLUMNS_PER_BRANCH = 2;
const MAX_COLUMN_INDEX = BRANCH_COLUMNS.length * MONEY_COLUMNS_PER_BRANCH - 1;

function getApiBasics() {
  const token = sessionStorage.getItem('token');
  const baseUrl = import.meta.env.VITE_API_URL;

  if (!token) {
    throw new Error('Kein Token gefunden.');
  }

  if (!baseUrl) {
    throw new Error('VITE_API_URL fehlt.');
  }

  return { token, baseUrl };
}

function formatGermanDate(isoDate) {
  if (!isoDate) return '';

  const [year, month, day] = isoDate.split('-');

  if (!year || !month || !day) {
    return isoDate;
  }

  return `${day}.${month}.${year}`;
}

function formatMoneyValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function getFilialeCell(row, filiale) {
  return row?.filialen?.[filiale] || {
    id: null,
    sollBetrag: null,
    istBetrag: null,
    status: 'offen',
    bemerkung: null,
    updatedAt: null,
  };
}

function getTransferValue(row) {
  return row?.gesamtUeberweisung?.betrag ?? null;
}

function MonthTabs({ activeMonth, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {MONTHS_2026.map((month) => {
        const active = month.value === activeMonth.value;

        return (
          <button
            key={month.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(month)}
            className={`px-4 py-2 rounded-t-lg border text-sm font-bold transition shadow disabled:opacity-50 disabled:cursor-not-allowed ${
              active
                ? 'bg-[#800000] border-[#800000] text-white'
                : 'bg-[#2f2d2d] border-white/10 text-white/65 hover:bg-[#3a3636] hover:text-white'
            }`}
          >
            {month.label}
          </button>
        );
      })}
    </div>
  );
}

function PaymentBlock({
  title,
  blockKey,
  paymentType,
  rows,
  disabled,
  cellRefs,
  onChange,
  onCommit,
  onNavigate,
}) {
  return (
    <div className="rounded-xl border border-black/40 bg-white overflow-hidden shadow-[4px_4px_14px_rgba(0,0,0,0.22)]">
      <div className="bg-[#b7b7b7] border-b border-black/40 px-4 py-2 font-black tracking-wide text-center uppercase">
        {title}
      </div>

      <div className="overflow-auto">
        <div className="min-w-[1380px]">
          <div className="grid grid-cols-[120px_repeat(8,130px)_170px] text-xs font-bold border-b border-black/40">
            <div className="bg-[#eeeeee] border-r border-black/30 px-2 py-2 flex items-center justify-center">
              Datum
            </div>

            {BRANCH_COLUMNS.map((branch) => (
              <div key={branch.key} className="contents">
                <div className="bg-[#eeeeee] border-r border-black/30 px-2 py-2 text-center">
                  {branch.label} IST
                </div>
                <div className="bg-[#eeeeee] border-r border-black/30 px-2 py-2 text-center">
                  {branch.label} SOLL
                </div>
              </div>
            ))}

            <div className="bg-[#eeeeee] px-2 py-2 text-center">
              Gesamt Überweisung
            </div>
          </div>

          {rows.map((row, rowIndex) => (
            <div
              key={`${paymentType}-${row.datum}`}
              className="grid grid-cols-[120px_repeat(8,130px)_170px] text-xs border-b border-black/20 last:border-b-0 min-h-[38px]"
            >
              <div className="bg-white border-r border-black/20 px-2 py-2 font-semibold text-center">
                {formatGermanDate(row.datum)}
              </div>

              {BRANCH_COLUMNS.map((branch, branchIndex) => {
                const cell = getFilialeCell(row, branch.key);
                const istColumnIndex = branchIndex * MONEY_COLUMNS_PER_BRANCH;
                const sollColumnIndex = istColumnIndex + 1;
                const istCellKey = createCellKey({
                  blockKey,
                  rowIndex,
                  columnIndex: istColumnIndex,
                });
                const sollCellKey = createCellKey({
                  blockKey,
                  rowIndex,
                  columnIndex: sollColumnIndex,
                });

                return (
                  <div key={`${paymentType}-${row.datum}-${branch.key}`} className="contents">
                    <div className="bg-white border-r border-black/20">
                      <MoneyCell
                        ref={(inputElement) => {
                          if (inputElement) {
                            cellRefs.current[istCellKey] = inputElement;
                          } else {
                            delete cellRefs.current[istCellKey];
                          }
                        }}
                        value={formatMoneyValue(cell.istBetrag)}
                        disabled={disabled}
                        onChange={(value) =>
                          onChange({
                            paymentType,
                            datum: row.datum,
                            filiale: branch.key,
                            field: 'istBetrag',
                            value,
                          })
                        }
                        onCommit={(value) =>
                          onCommit({
                            paymentType,
                            row,
                            filiale: branch.key,
                            sollBetrag: cell.sollBetrag,
                            istBetrag: value,
                            status: cell.status,
                            bemerkung: cell.bemerkung,
                          })
                        }
                        onNavigate={(direction) =>
                          onNavigate({
                            currentCellKey: istCellKey,
                            direction,
                            blockKey,
                            maxRowIndex: rows.length - 1,
                            maxColumnIndex: MAX_COLUMN_INDEX,
                          })
                        }
                      />
                    </div>

                    <div className="bg-white border-r border-black/20">
                      <MoneyCell
                        ref={(inputElement) => {
                          if (inputElement) {
                            cellRefs.current[sollCellKey] = inputElement;
                          } else {
                            delete cellRefs.current[sollCellKey];
                          }
                        }}
                        value={formatMoneyValue(cell.sollBetrag)}
                        disabled={disabled}
                        onChange={(value) =>
                          onChange({
                            paymentType,
                            datum: row.datum,
                            filiale: branch.key,
                            field: 'sollBetrag',
                            value,
                          })
                        }
                        onCommit={(value) =>
                          onCommit({
                            paymentType,
                            row,
                            filiale: branch.key,
                            sollBetrag: value,
                            istBetrag: cell.istBetrag,
                            status: cell.status,
                            bemerkung: cell.bemerkung,
                          })
                        }
                        onNavigate={(direction) =>
                          onNavigate({
                            currentCellKey: sollCellKey,
                            direction,
                            blockKey,
                            maxRowIndex: rows.length - 1,
                            maxColumnIndex: MAX_COLUMN_INDEX,
                          })
                        }
                      />
                    </div>
                  </div>
                );
              })}

              <div className="bg-white">
                <MoneyCell
                  value={formatMoneyValue(getTransferValue(row))}
                  disabled
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EcCashModal() {
  const [activeMonth, setActiveMonth] = useState(MONTHS_2026[0]);
  const [monthData, setMonthData] = useState({
    ecCash: {
      paymentType: 'EC_CASH',
      tage: [],
    },
    kreditkarte: {
      paymentType: 'KREDITKARTE',
      tage: [],
    },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const cellRefs = useRef({});
  const pendingFocusRef = useRef(null);

  function updateLocalPaymentDay({
    paymentType,
    datum,
    filiale,
    field,
    value,
  }) {
    setMonthData((currentData) => {
      const blockKey = paymentType === 'KREDITKARTE' ? 'kreditkarte' : 'ecCash';
      const currentBlock = currentData[blockKey];

      return {
        ...currentData,
        [blockKey]: {
          ...currentBlock,
          tage: currentBlock.tage.map((row) => {
            if (row.datum !== datum) {
              return row;
            }

            const currentCell = getFilialeCell(row, filiale);

            return {
              ...row,
              filialen: {
                ...row.filialen,
                [filiale]: {
                  ...currentCell,
                  [field]: value,
                },
              },
            };
          }),
        },
      };
    });
  }

  function focusPendingCell() {
    if (!pendingFocusRef.current || loading || saving) {
      return;
    }

    const focused = focusRegisteredCell(cellRefs, pendingFocusRef.current);

    if (focused) {
      pendingFocusRef.current = null;
    }
  }

  function handleNavigate({
    currentCellKey,
    direction,
    maxRowIndex,
    maxColumnIndex,
  }) {
    const nextCellKey = getNextCellKey({
      currentKey: currentCellKey,
      direction,
      maxRowIndex,
      maxColumnIndex,
    });

    if (!nextCellKey) {
      return;
    }

    pendingFocusRef.current = nextCellKey;
    focusRegisteredCell(cellRefs, nextCellKey);
  }

  async function loadMonth(monthValue) {
    setLoading(true);
    setError('');

    try {
      const { token, baseUrl } = getApiBasics();

      const response = await fetch(
        `${baseUrl}/api/controlling/ec-cash/month?jahr=${YEAR}&monat=${monthValue}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Monatsdaten konnten nicht geladen werden. HTTP ${response.status}`
        );
      }

      setMonthData({
        ecCash: data.ecCash || {
          paymentType: 'EC_CASH',
          tage: [],
        },
        kreditkarte: data.kreditkarte || {
          paymentType: 'KREDITKARTE',
          tage: [],
        },
      });
    } catch (loadError) {
      console.error('EC-Cash-Monatsdaten konnten nicht geladen werden:', loadError);
      setError(loadError.message || 'Monatsdaten konnten nicht geladen werden.');
      setMonthData({
        ecCash: {
          paymentType: 'EC_CASH',
          tage: [],
        },
        kreditkarte: {
          paymentType: 'KREDITKARTE',
          tage: [],
        },
      });
    } finally {
      setLoading(false);
    }
  }

  async function savePaymentDay({
    paymentType,
    row,
    filiale,
    sollBetrag,
    istBetrag,
    status,
    bemerkung,
  }) {
    if (!paymentType || !row?.datum || !filiale) {
      setError('Speichern nicht möglich: Zahlungsart, Datum oder Filiale fehlt.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { token, baseUrl } = getApiBasics();

      const payload = {
        paymentType,
        filiale,
        datum: row.datum,
        sollBetrag,
        istBetrag,
        status: status || 'offen',
        bemerkung: bemerkung || null,
      };

      const response = await fetch(`${baseUrl}/api/controlling/payment-days`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Tageswert konnte nicht gespeichert werden. HTTP ${response.status}`
        );
      }

      await loadMonth(activeMonth.value);
    } catch (saveError) {
      console.error('Tageswert konnte nicht gespeichert werden:', saveError);
      setError(saveError.message || 'Tageswert konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadMonth(activeMonth.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonth.value]);

  useEffect(() => {
    focusPendingCell();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthData, loading, saving]);

  return (
    <div className="h-full rounded-2xl border border-white/10 bg-[#2f2d2d] text-white overflow-hidden flex flex-col shadow-[6px_6px_18px_rgba(0,0,0,0.7)]">
      <div className="bg-black/20 border-b border-white/10 px-6 py-5 shrink-0">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-2xl font-black text-white">
              Controlling EC Cash / Kreditkarte 2026
            </div>
            <div className="text-sm text-white/55 mt-1">
              Excel-nahe Monatsansicht · Backendbetrieb
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-100">
                {error}
              </div>
            )}
          </div>

          <div className="text-right text-sm text-white/55">
            Aktiver Monat
            <div className="text-xl font-black text-white mt-1">
              {activeMonth.label}
            </div>

            {(loading || saving) && (
              <div className="mt-2 text-xs font-bold text-white/60">
                {saving ? 'Speichert ...' : 'Lädt ...'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pt-5 shrink-0">
        <MonthTabs
          activeMonth={activeMonth}
          onChange={setActiveMonth}
          disabled={loading || saving}
        />
      </div>

      <div className="p-6 overflow-auto flex-1">
        <div className="rounded-2xl border border-white/10 bg-[#f5f2eb] text-[#1f1f1f] p-6 shadow-[6px_6px_18px_rgba(0,0,0,0.35)]">
          <div className="space-y-8">
            <PaymentBlock
              title="EC Cash Buchungen"
              blockKey="ecCash"
              paymentType={monthData.ecCash.paymentType}
              rows={monthData.ecCash.tage}
              disabled={loading || saving}
              cellRefs={cellRefs}
              onChange={updateLocalPaymentDay}
              onCommit={savePaymentDay}
              onNavigate={handleNavigate}
            />

            <PaymentBlock
              title="Kreditkarte"
              blockKey="kreditkarte"
              paymentType={monthData.kreditkarte.paymentType}
              rows={monthData.kreditkarte.tage}
              disabled={loading || saving}
              cellRefs={cellRefs}
              onChange={updateLocalPaymentDay}
              onCommit={savePaymentDay}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
