import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDayCloseV2ViewModel, parseMoneyToCents, validateDailyReport } from './tagesabschlussV2.mjs';

test('berechnet Fortschritt nur aus erforderlichen Prozessen', () => {
  const model = buildDayCloseV2ViewModel({
    processStates: {
      'bank-preparation': { status: 'completed' },
      'bank-booking': { status: 'completed' },
      'safe-target': { status: 'completed' },
      'safe-movement': { status: 'completed' },
      'final-safe-count': { status: 'open' },
      finalize: { required: false },
    },
  });

  assert.deepEqual(model.progress, { completed: 4, required: 6, percent: 67 });
});

test('sperrt Folgeprozesse bis ihre fachlichen Voraussetzungen erledigt sind', () => {
  const model = buildDayCloseV2ViewModel({
    processStates: {
      'bank-preparation': { status: 'completed' },
    },
  });

  assert.equal(model.processes.find((item) => item.id === 'bank-preparation').status, 'completed');
  assert.equal(model.processes.find((item) => item.id === 'bank-booking').status, 'open');
  assert.equal(model.processes.find((item) => item.id === 'safe-target').status, 'open');
  assert.equal(model.processes.find((item) => item.id === 'final-safe-count').status, 'open');
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

