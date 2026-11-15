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

function getCurrentMonth() {
  const currentMonthValue = new Date().getMonth() + 1;
  return MONTHS_2026.find((month) => month.value === currentMonthValue) || MONTHS_2026[0];
}
const BRANCH_COLUMNS = [
  { key: 'Telgte', label: 'Telgte' },
  { key: 'Ahaus', label: 'Ahaus' },
  { key: 'Vreden', label: 'Vreden' },
  { key: 'Münster', label: 'Münster' },
];

const MONEY_COLUMNS_PER_BRANCH = 2;
const TRANSFER_COLUMN_INDEX = BRANCH_COLUMNS.length * MONEY_COLUMNS_PER_BRANCH;
const MAX_COLUMN_INDEX = TRANSFER_COLUMN_INDEX;

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

function formatMoneyDisplay(value) {
  if (value === null || value === undefined || value === '') return '';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

const CONFIRMED_REVIEW_STATUSES = new Set(['BESTAETIGT', 'KORRIGIERT', 'EXTERN_BESTAETIGT']);

function getFilialeCell(row, filiale) {
  return row?.filialen?.[filiale] || {
    id: null,
    sollBetrag: null,
    istBetrag: null,
    reviewStatus: 'OFFEN',
    reviewedBy: null,
    reviewedAt: null,
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
  onTransferChange,
  onTransferCommit,
  onConfirmQlik,
  confirmingCellId,
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
            <div className="row-span-2 bg-[#eeeeee] border-r border-black/30 px-2 py-2 flex items-center justify-center">
              Datum
            </div>

            {BRANCH_COLUMNS.map((branch) => (
              <div
                key={branch.key}
                className="col-span-2 bg-[#dddddd] border-r border-b border-black/30 px-2 py-2 text-center text-sm"
              >
                {branch.label}
              </div>
            ))}

            <div className="row-span-2 bg-[#eeeeee] px-2 py-2 flex items-center justify-center text-center">
              Gesamt Überweisung
            </div>

            {BRANCH_COLUMNS.map((branch) => (
              <div key={`${branch.key}-subcolumns`} className="contents">
                <div className="bg-[#eeeeee] border-r border-black/30 px-2 py-2 text-center">
                  IST · Match-Engine
                </div>
                <div className="bg-[#eeeeee] border-r border-black/30 px-2 py-2 text-center">
                  SOLL · Qlik
                </div>
              </div>
            ))}
          </div>

          {rows.map((row, rowIndex) => {
            const transferCellKey = createCellKey({
              blockKey,
              rowIndex,
              columnIndex: TRANSFER_COLUMN_INDEX,
            });

            return (
            <div
              key={`${paymentType}-${row.datum}`}
              className="grid grid-cols-[120px_repeat(8,130px)_170px] text-xs border-b border-black/20 last:border-b-0 min-h-[38px]"
            >
              <div className="bg-white border-r border-black/20 px-2 py-2 font-semibold text-center">
                {formatGermanDate(row.datum)}
              </div>

              {BRANCH_COLUMNS.map((branch, branchIndex) => {
                const cell = getFilialeCell(row, branch.key);
                const sollColumnIndex = (branchIndex * MONEY_COLUMNS_PER_BRANCH) + 1;
                const sollCellKey = createCellKey({
                  blockKey,
                  rowIndex,
                  columnIndex: sollColumnIndex,
                });

                return (
                  <div key={`${paymentType}-${row.datum}-${branch.key}`} className="contents">
                    <div
                      className="flex min-h-[38px] items-center justify-end border-r border-black/20 bg-white px-2 py-1 text-right text-xs font-semibold text-[#1f1f1f]"
                      title={cell.istBetrag == null ? 'Noch kein bestätigter Match' : 'Durch bestätigten Match befüllt'}
                    >
                      {formatMoneyDisplay(cell.istBetrag)}
                    </div>

                    <div className="bg-white border-r border-black/20">
                      <button
                        ref={(buttonElement) => {
                          if (buttonElement) {
                            cellRefs.current[sollCellKey] = buttonElement;
                          } else {
                            delete cellRefs.current[sollCellKey];
                          }
                        }}
                        type="button"
                        disabled={disabled || !cell.id || cell.sollBetrag == null || CONFIRMED_REVIEW_STATUSES.has(cell.reviewStatus)}
                        onClick={() => onConfirmQlik({ paymentType, datum: row.datum, filiale: branch.key, cell })}
                        onKeyDown={(event) => {
                          const directionByKey = {
                            ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
                          };
                          const direction = directionByKey[event.key];
                          if (!direction) return;
                          event.preventDefault();
                          onNavigate({
                            currentCellKey: sollCellKey,
                            direction,
                            blockKey,
                            maxRowIndex: rows.length - 1,
                            maxColumnIndex: MAX_COLUMN_INDEX,
                          });
                        }}
                        title={CONFIRMED_REVIEW_STATUSES.has(cell.reviewStatus)
                          ? `Bestätigt${cell.reviewedBy ? ` von ${cell.reviewedBy}` : ''}`
                          : 'Qlik-Wert mit einem Klick bestätigen'}
                        className={`h-full min-h-[38px] w-full px-2 py-1 text-right text-xs font-semibold outline-none transition focus:ring-2 focus:ring-inset focus:ring-[#800000] ${
                          CONFIRMED_REVIEW_STATUSES.has(cell.reviewStatus)
                            ? 'cursor-default text-[#1f1f1f]'
                            : 'cursor-pointer text-orange-600 hover:bg-orange-50 hover:text-orange-700'
                        } disabled:opacity-100`}
                      >
                        {confirmingCellId === cell.id ? 'Speichert …' : formatMoneyDisplay(cell.sollBetrag)}
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="bg-white">
                <MoneyCell
                  ref={(inputElement) => {
                    if (inputElement) {
                      cellRefs.current[transferCellKey] = inputElement;
                    } else {
                      delete cellRefs.current[transferCellKey];
                    }
                  }}
                  value={formatMoneyValue(getTransferValue(row))}
                  disabled={disabled}
                  onChange={(value) => onTransferChange({ paymentType, datum: row.datum, value })}
                  onCommit={(value) => onTransferCommit({ paymentType, row, amount: value })}
                  onNavigate={(direction) =>
                    onNavigate({
                      currentCellKey: transferCellKey,
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
        </div>
      </div>
    </div>
  );
}
export default function EcCashModal() {
  const [activeMonth, setActiveMonth] = useState(getCurrentMonth);
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
  const [confirmingCellId, setConfirmingCellId] = useState(null);
  const [error, setError] = useState('');
  const cellRefs = useRef({});
  const pendingFocusRef = useRef(null);

  function updateLocalTransfer({ paymentType, datum, value }) {
    setMonthData((currentData) => {
      const blockKey = paymentType === 'KREDITKARTE' ? 'kreditkarte' : 'ecCash';
      const currentBlock = currentData[blockKey];

      return {
        ...currentData,
        [blockKey]: {
          ...currentBlock,
          tage: currentBlock.tage.map((row) => row.datum === datum
            ? {
              ...row,
              gesamtUeberweisung: {
                ...row.gesamtUeberweisung,
                betrag: value,
              },
            }
            : row),
        },
      };
    });
  }

  function markQlikCellConfirmed({ paymentType, datum, filiale, reviewedAt }) {
    setMonthData((currentData) => {
      const blockKey = paymentType === 'KREDITKARTE' ? 'kreditkarte' : 'ecCash';
      const currentBlock = currentData[blockKey];
      return {
        ...currentData,
        [blockKey]: {
          ...currentBlock,
          tage: currentBlock.tage.map((row) => row.datum !== datum ? row : {
            ...row,
            filialen: {
              ...row.filialen,
              [filiale]: {
                ...getFilialeCell(row, filiale),
                reviewStatus: 'BESTAETIGT',
                reviewedAt,
              },
            },
          }),
        },
      };
    });
  }

  async function confirmQlikCell({ paymentType, datum, filiale, cell }) {
    if (!cell?.id || CONFIRMED_REVIEW_STATUSES.has(cell.reviewStatus) || confirmingCellId) return;
    setConfirmingCellId(cell.id);
    setError('');
    try {
      const { token, baseUrl } = getApiBasics();
      const response = await fetch(`${baseUrl}/api/controlling/payment-days/${cell.id}/review`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Qlik-Wert konnte nicht bestätigt werden. HTTP ${response.status}`);
      }
      markQlikCellConfirmed({ paymentType, datum, filiale, reviewedAt: data.reviewedAt || new Date().toISOString() });
    } catch (confirmError) {
      console.error('Qlik-Wert konnte nicht bestätigt werden:', confirmError);
      setError(confirmError.message || 'Qlik-Wert konnte nicht bestätigt werden.');
    } finally {
      setConfirmingCellId(null);
    }
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

  async function saveClassicTransfer({ paymentType, row, amount }) {
    if (!paymentType || !row?.datum || amount === '') {
      setError('Speichern nicht möglich: Zahlungsart, Datum oder Betrag fehlt.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { token, baseUrl } = getApiBasics();
      const response = await fetch(`${baseUrl}/api/controlling/transfers/classic`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentType, datum: row.datum, amount }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error ||
          `Gesamtüberweisung konnte nicht gespeichert werden. HTTP ${response.status}`
        );
      }

      await loadMonth(activeMonth.value);
    } catch (saveError) {
      console.error('Gesamtüberweisung konnte nicht gespeichert werden:', saveError);
      setError(saveError.message || 'Gesamtüberweisung konnte nicht gespeichert werden.');
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
              onTransferChange={updateLocalTransfer}
              onTransferCommit={saveClassicTransfer}
              onConfirmQlik={confirmQlikCell}
              confirmingCellId={confirmingCellId}
              onNavigate={handleNavigate}
            />

            <PaymentBlock
              title="Kreditkarte"
              blockKey="kreditkarte"
              paymentType={monthData.kreditkarte.paymentType}
              rows={monthData.kreditkarte.tage}
              disabled={loading || saving}
              cellRefs={cellRefs}
              onTransferChange={updateLocalTransfer}
              onTransferCommit={saveClassicTransfer}
              onConfirmQlik={confirmQlikCell}
              confirmingCellId={confirmingCellId}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
