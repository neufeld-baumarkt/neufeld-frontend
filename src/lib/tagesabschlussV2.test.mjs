import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDayCloseV2ViewModel } from './tagesabschlussV2.mjs';

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

  assert.deepEqual(model.progress, { completed: 4, required: 5, percent: 80 });
});

test('sperrt Folgeprozesse bis ihre fachlichen Voraussetzungen erledigt sind', () => {
  const model = buildDayCloseV2ViewModel({
    processStates: {
      'bank-preparation': { status: 'completed' },
    },
  });

  assert.equal(model.processes.find((item) => item.id === 'bank-preparation').status, 'completed');
  assert.equal(model.processes.find((item) => item.id === 'bank-booking').status, 'open');
  assert.equal(model.processes.find((item) => item.id === 'safe-target').status, 'locked');
  assert.equal(model.processes.find((item) => item.id === 'final-safe-count').status, 'locked');
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

