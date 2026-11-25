import assert from 'node:assert/strict';
import test from 'node:test';
import { COIN_ROLLS, coinRollAlerts, coinRollWarning } from './tresorzaehlung.mjs';

test('warns at the exact thresholds and distinguishes blank input from zero', () => {
  assert.deepEqual([undefined, '', 0, '1', 2, 3, 4, 5].map(coinRollWarning), [
    null, null, 'critical', 'critical', 'critical', 'low', 'low', null,
  ]);
});

test('clears dashboard alerts when the latest count puts every denomination above four', () => {
  const counts = Object.fromEntries(COIN_ROLLS.map(({ cents }) => [cents, 5]));
  assert.deepEqual(coinRollAlerts(null), []);
  assert.deepEqual(coinRollAlerts({ ...counts, 10: 4, 50: 2 }), [
    { cents: 10, label: '10 ct', count: 4, severity: 'low' },
    { cents: 50, label: '50 ct', count: 2, severity: 'critical' },
  ]);
  assert.deepEqual(coinRollAlerts(counts), []);
});
