import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bankCountDifferences,
  bankTotalCents,
  calculateClosingPlan,
  closingEquationCents,
  expectedBankNoteCounts,
  parseEuroToCents,
  requiresDifferenceNotification,
  validateRetainedNotes,
} from './kassenabrechnung.mjs';

test('ermittelt Kleingeldentnahme und glatten Startwert für das Hochzählen', () => {
  const plan = calculateClosingPlan({ 1: 7, 10: 3, 50: 2, 100: 4, 200: 19, 500: 20, 1000: 20 });
  assert.equal(plan.coinTotalCents, 4_337);
  assert.equal(plan.retainedCoinCents, 4_000);
  assert.equal(plan.looseChangeCents, 337);
  assert.equal(plan.notesNeededCents, 21_000);
});

test('erzwingt eine mögliche Aufteilung aus 5-, 10- und 20-Euro-Scheinen', () => {
  const full = { 500: 4, 1000: 8, 2000: 10 };
  assert.equal(validateRetainedNotes(full, { 500: 2, 1000: 4, 2000: 8 }, 21_000), null);
  assert.match(validateRetainedNotes(full, { 500: 5, 1000: 4, 2000: 8 }, 22_500), /nicht mehr 5-Euro/);
});

test('vergleicht die unabhängig erneut gezählten Bar-an-Bank-Scheine je Stückelung', () => {
  const full = { 500: 8, 1000: 8, 2000: 6, 5000: 2, 10000: 1, 20000: 1 };
  const retained = { 500: 4, 1000: 3, 2000: 4 };
  const expected = expectedBankNoteCounts(full, retained);
  assert.deepEqual(expected, { 500: 4, 1000: 5, 2000: 2, 5000: 2, 10000: 1, 20000: 1 });
  assert.equal(bankTotalCents(expected), 51_000);
  assert.deepEqual(bankCountDifferences(full, retained, { ...expected, 1000: 4 }), [
    { cents: 1000, expected: 5, actual: 4 },
  ]);
});

test('lässt den Abschluss ausschließlich bei exakt 250 Euro Restbestand zu', () => {
  assert.equal(closingEquationCents({ countedTotalCents: 67_337, bankAmountCents: 42_000, looseChangeCents: 337 }), 25_000);
});

test('parst EuroControl-Summen centgenau und markiert nur Einzelabweichungen über 5 Euro', () => {
  assert.equal(parseEuroToCents('420,00'), 42_000);
  assert.equal(parseEuroToCents('1.234,56'), 123_456);
  assert.equal(parseEuroToCents('12,345'), null);
  assert.equal(requiresDifferenceNotification(500), false);
  assert.equal(requiresDifferenceNotification(-501), true);
});

