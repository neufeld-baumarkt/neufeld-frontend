import test from 'node:test';
import assert from 'node:assert/strict';
import { mayStartCashWorkflow, normalizeMaintenanceStatus } from './maintenancePolicy.mjs';

test('Wartungssperre lässt ausschließlich bereits gespeicherte Kassenprozesse weiterlaufen', () => {
  assert.equal(mayStartCashWorkflow({ mode: 'open' }, null), true);
  assert.equal(mayStartCashWorkflow({ mode: 'draining' }, null), false);
  assert.equal(mayStartCashWorkflow({ mode: 'draining' }, { revision: 3 }), true);
  assert.equal(mayStartCashWorkflow({ mode: 'maintenance' }, { revision: 3 }), false);
  assert.equal(mayStartCashWorkflow({ mode: 'unavailable' }, null), false);
});

test('öffentlicher Wartungsstatus wird defensiv normalisiert', () => {
  assert.deepEqual(normalizeMaintenanceStatus({ mode: 'draining', revision: '2', activeCashProcesses: '3' }), {
    mode: 'draining', message: null, revision: 2, activeCashProcesses: 3,
    lastCashActivityAt: null, updatedAt: null,
  });
  assert.equal(normalizeMaintenanceStatus({ mode: 'kaputt' }).mode, 'unavailable');
});
