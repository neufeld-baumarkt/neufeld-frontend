import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CASH_DENOMINATIONS,
  countCashCents,
  previousClosingHasDifference,
  shouldRecommendOpeningRecount,
  openingDifferenceCents,
} from './kasseneinzaehlung.mjs';

test('ordnet die Zählfelder von 1 Cent bis 200 Euro', () => {
  assert.deepEqual(
    CASH_DENOMINATIONS.map(({ cents }) => cents),
    [1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000]
  );
});

test('summiert die Stückelungen centgenau', () => {
  assert.equal(countCashCents({ 5000: 4, 2000: 2, 500: 2 }), 25_000);
});

test('berechnet die Abweichung zum bindenden Bestand von 250 Euro', () => {
  assert.equal(openingDifferenceCents(25_500), 500);
  assert.equal(openingDifferenceCents(24_750), -250);
});

test('erkennt jede offene Vorgängerdifferenz derselben Lade unabhängig vom Betrag', () => {
  const previousClosing = {
    status: 'closed', branch: 'Vreden', drawerNumber: 1, differenceCents: -500, resolved: false,
  };
  assert.equal(previousClosingHasDifference({
    branch: 'Vreden', drawerNumber: 1, previousClosing,
  }), true);
  assert.equal(previousClosingHasDifference({
    branch: 'Vreden', drawerNumber: 2, previousClosing,
  }), false);
});

test('ignoriert nur Nullwerte und bereits erledigte Vorgängerdifferenzen', () => {
  const base = { status: 'closed', branch: 'Vreden', drawerNumber: 1, resolved: false };
  for (const previousClosing of [
    { ...base, differenceCents: 0 },
    { ...base, differenceCents: -500, resolved: true },
  ]) {
    assert.equal(previousClosingHasDifference({
      branch: 'Vreden', drawerNumber: 1, previousClosing,
    }), false);
  }
  assert.equal(previousClosingHasDifference({
    branch: 'Vreden', drawerNumber: 1, previousClosing: { ...base, differenceCents: -400 },
  }), true);
});

test('empfiehlt eine Neuzählung nur über zwei Euro ohne gespeicherte Vorgängerdifferenz', () => {
  assert.equal(shouldRecommendOpeningRecount({ differenceCents: 200, hasPreviousDifference: false }), false);
  assert.equal(shouldRecommendOpeningRecount({ differenceCents: -201, hasPreviousDifference: false }), true);
  assert.equal(shouldRecommendOpeningRecount({ differenceCents: 500, hasPreviousDifference: true }), false);
});
