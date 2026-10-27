import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSafeCount, countTypeLabels } from './tresorzaehlung.mjs';

test('berechnet den Excel-Tresorbestand mit Rollenwerten statt Münzstücken', () => {
  const result = calculateSafeCount({
    fixedDrawerCents: 50000, littleBerthaCents: 100000, looseMoneyCents: 472,
    coinRollCounts: { 1: 17, 2: 19, 5: 24, 10: 26, 20: 16, 50: 7, 100: 4, 200: 4 },
    banknoteCounts: { 500: 4, 1000: 10, 2000: 6 },
  });
  assert.equal(result.rollTotalCents, 75950);
  assert.equal(result.banknoteTotalCents, 24000);
  assert.equal(result.countedTotalCents, 250422);
});

test('zeigt für Übergabe zwei fachlich feste Rollen', () => {
  assert.deepEqual(countTypeLabels('handover'), { title: 'Schichtübergabe', first: 'Übernahme durch', second: 'Übergabe durch' });
});

test('bestätigt den erwarteten Endbestand nach Kleingeldausgleich und Abschöpfung', () => {
  const result = calculateSafeCount({
    fixedDrawerCents: 50000,
    littleBerthaCents: 100000,
    looseMoneyCents: 40,
    coinRollCounts: {},
    banknoteCounts: { 20000: 5 },
  });
  assert.equal(result.countedTotalCents, 250040);
  assert.equal(result.countedTotalCents - 250040, 0);
});
