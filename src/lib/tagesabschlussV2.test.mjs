import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDayCloseV2ViewModel, calculateBankBooking, mapDayCloseContextToV2, parseMoneyToCents, sumBanknoteCounts, validateDailyReport } from './tagesabschlussV2.mjs';

test('berechnet Fortschritt nur aus erforderlichen Prozessen', () => {
  const model = buildDayCloseV2ViewModel({
    processStates: {
      'bank-preparation': { status: 'completed' },
      'bank-booking': { status: 'completed' },
      'safe-movement': { status: 'completed' },
      'final-safe-count': { status: 'open' },
      finalize: { required: false },
    },
  });

  assert.deepEqual(model.progress, { completed: 3, required: 5, percent: 60 });
});

test('sperrt Folgeprozesse bis ihre fachlichen Voraussetzungen erledigt sind', () => {
  const model = buildDayCloseV2ViewModel({
    processStates: {
      'bank-preparation': { status: 'completed' },
    },
  });

  assert.equal(model.processes.find((item) => item.id === 'bank-preparation').status, 'completed');
  assert.equal(model.processes.find((item) => item.id === 'bank-booking').status, 'open');
  assert.equal(model.processes.find((item) => item.id === 'safe-movement').status, 'locked');
  assert.equal(model.processes.find((item) => item.id === 'final-safe-count').status, 'locked');
  assert.equal(model.processes.find((item) => item.id === 'finalize').status, 'locked');
});

test('akzeptiert Komma und Punkt bei Geldbeträgen', () => {
  assert.equal(parseMoneyToCents('1.234,56'), 123456);
  assert.equal(parseMoneyToCents('1234.56'), 123456);
  assert.equal(parseMoneyToCents('0,89 €'), 89);
  assert.equal(parseMoneyToCents('abc'), null);
});

test('prüft alle vier Pflichtwerte des Filialberichts', () => {
  const valid = validateDailyReport({ dailyRevenue: '919,16', customerCount: '42', averageReceipt: '21,88', eurocontrolBank: '665,00' });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.data, { dailyRevenueCents: 91916, customerCount: 42, averageReceiptCents: 2188, eurocontrolBankCents: 66500 });

  const invalid = validateDailyReport({ dailyRevenue: '', customerCount: '0', averageReceipt: 'x', eurocontrolBank: '' });
  assert.equal(invalid.valid, false);
  assert.deepEqual(Object.keys(invalid.errors).sort(), ['averageReceipt', 'customerCount', 'dailyRevenue', 'eurocontrolBank']);
});

test('liefert Kennzahlen aus dem gespeicherten Tageskontext', () => {
  const model = buildDayCloseV2ViewModel({
    bankPayoutCents: 282500,
    bankPayoutStatus: 'final',
    looseChangeCents: 781,
    closingCount: 5,
    eurocontrolSafeTargetCents: 250081,
    latestSafeCount: { countedTotalCents: 250781, completedAt: '2026-10-27T13:04:00+01:00', countType: 'handover' },
  });

  assert.equal(model.summary.bankPayoutCents, 282500);
  assert.equal(model.summary.looseChangeCents, 781);
  assert.equal(model.summary.eurocontrolSafeTargetCents, 250081);
  assert.equal(model.summary.latestSafeCount.countType, 'handover');
});

test('summiert die Scheine aller Einzelkassen', () => {
  assert.equal(sumBanknoteCounts({ 5: 11, 10: 26, 20: 28, 50: 30, 100: 1, 200: 0 }), 247500);
});

test('übernimmt den echten Geschäftstag in den modularen V2-Kontext', () => {
  const context = mapDayCloseContextToV2({
    closings: [
      { bankNoteCounts: { 500: 3, 1000: 2 }, looseChangeCents: 459 },
      { bankNoteCounts: { 500: 4, 2000: 1 }, looseChangeCents: 1000 },
    ],
    baseSafeCount: { countedTotalCents: 250081, fixedDrawerCents: 50000, littleBerthaCents: 100000 },
    totals: { cashRevenueCents: 248959, looseChangeTotalCents: 1459, standardBalanceCents: 250000 },
  });
  assert.equal(context.bankPayoutCents, 248959);
  assert.equal(context.looseChangeCents, 1459);
  assert.equal(context.closingCount, 2);
  assert.deepEqual(context.individualCashBanknotes, { 5: 7, 10: 2, 20: 1, 50: 0, 100: 0, 200: 0 });
  assert.equal(context.fixedDrawerCents, 50000);
  assert.equal(context.littleBerthaCents, 100000);
});

test('verwendet Tresor-Grundwerte auch ohne vorhandene Tageszählung', () => {
  const context = mapDayCloseContextToV2({
    closings: [],
    baseSafeCount: null,
    safeSettings: { fixedDrawerCents: 50000, littleBerthaCents: 100000 },
    totals: { cashRevenueCents: 0, looseChangeTotalCents: 0, standardBalanceCents: 150000 },
    processStates: { 'daily-report': { status: 'completed' } },
  });
  assert.equal(context.fixedDrawerCents, 50000);
  assert.equal(context.littleBerthaCents, 100000);
  assert.equal(context.processStates['daily-report'].status, 'completed');
});

test('prüft Scheine plus Kleingeldausgleich hart gegen den Filialbericht', () => {
  const result = calculateBankBooking({
    banknoteCounts: { 5: 11, 10: 26, 20: 28, 50: 30, 100: 1, 200: 0 },
    eurocontrolBankCents: 248959,
    looseChangeCents: 1459,
    latestSafeCountCents: 250081,
    safeStandardCents: 250000,
  });
  assert.equal(result.banknoteTotalCents, 247500);
  assert.equal(result.changeTransferCents, 1000);
  assert.equal(result.roundedEurocontrolBankCents, 248500);
  assert.equal(result.skimCents, 500);
  assert.equal(result.safeTransferCents, 1500);
  assert.equal(result.expectedSafeAfterSkimCents, 250040);
  assert.equal(result.bookingTotalCents, 249000);
  assert.equal(result.finalDenominationTotalCents, 249000);
  assert.equal(result.finalCounts[5], 14);
  assert.equal(result.valid, true);
});

test('blockiert die Buchung bei unpassender Scheinsumme', () => {
  const result = calculateBankBooking({
    banknoteCounts: { 5: 10, 10: 26, 20: 28, 50: 30, 100: 1, 200: 0 },
    eurocontrolBankCents: 248959,
    looseChangeCents: 1459,
    latestSafeCountCents: 250081,
    safeStandardCents: 250000,
  });
  assert.equal(result.banknoteTotalCents, 247000);
  assert.equal(result.expectedBanknoteTotalCents, 247500);
  assert.equal(result.valid, false);
});

