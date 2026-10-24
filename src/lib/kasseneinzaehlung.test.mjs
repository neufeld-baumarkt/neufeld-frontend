import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CASH_DENOMINATIONS,
  countCashCents,
  matchesImmediatePreviousClosing,
  nextDifferenceStep,
  openingDifferenceCents,
} from './kasseneinzaehlung.mjs';

test('ordnet die Stückelungen in der Zählreihenfolge von 1 Cent bis 200 Euro', () => {
  assert.deepEqual(
    CASH_DENOMINATIONS.map(({ cents }) => cents),
    [1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000],
  );
});

test('summiert die Stückelungen centgenau', () => {
  assert.equal(countCashCents({ 5000: 4, 2000: 2, 500: 2 }), 25_000);
});

test('berechnet die Abweichung zum bindenden Bestand von 250 Euro', () => {
  assert.equal(openingDifferenceCents(25_500), 500);
  assert.equal(openingDifferenceCents(24_750), -250);
});

test('ordnet ausschließlich die unmittelbar übergebene letzte Abrechnung derselben Lade zu', () => {
  const previousClosing = {
    status: 'closed', branch: 'Vreden', drawerNumber: 1, differenceCents: -500, resolved: false,
  };
  assert.equal(matchesImmediatePreviousClosing({
    branch: 'Vreden', drawerNumber: 1, openingDifference: 500, previousClosing,
  }), true);
  assert.equal(matchesImmediatePreviousClosing({
    branch: 'Vreden', drawerNumber: 2, openingDifference: 500, previousClosing,
  }), false);
});

test('ordnet weder Null-, Teil- noch bereits erledigte Differenzen zu', () => {
  const base = { status: 'closed', branch: 'Vreden', drawerNumber: 1, resolved: false };
  for (const previousClosing of [
    { ...base, differenceCents: 0 },
    { ...base, differenceCents: -400 },
    { ...base, differenceCents: -500, resolved: true },
  ]) {
    assert.equal(matchesImmediatePreviousClosing({
      branch: 'Vreden', drawerNumber: 1, openingDifference: 500, previousClosing,
    }), false);
  }
});

test('führt nach erster und zweiter Abweichung durch die vereinbarte Eskalation', () => {
  assert.equal(nextDifferenceStep(0), 'same-person-recount');
  assert.equal(nextDifferenceStep(1), 'recommend-other-person');
  assert.equal(nextDifferenceStep(2), 'adjust-to-target');
});
