import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bankTotalCents,
  calculateClosingPlan,
  closingEquationCents,
  parseEuroToCents,
  requiresDifferenceNotification,
  validateBankNoteCounts,
} from './kassenabrechnung.mjs';

test('ermittelt Kleingeldentnahme und glatten Startwert für das Hochzählen', () => {
  const plan = calculateClosingPlan({ 1: 7, 10: 3, 50: 2, 100: 4, 200: 19, 500: 20, 1000: 20 });
  assert.equal(plan.coinTotalCents, 4_337);
  assert.equal(plan.retainedCoinCents, 4_000);
  assert.equal(plan.looseChangeCents, 337);
  assert.equal(plan.notesNeededCents, 21_000);
});

test('prüft Bar-an-Bank-Scheine ohne die in der Lade verbliebenen Scheine zu erfassen', () => {
  const full = { 500: 17, 1000: 19, 2000: 13, 5000: 15, 10000: 0, 20000: 0 };
  const bank = { 500: 7, 1000: 14, 2000: 9, 5000: 15, 10000: 0, 20000: 0 };
  assert.equal(validateBankNoteCounts(full, bank), null);
  assert.equal(bankTotalCents(bank), 110_500);
  assert.match(validateBankNoteCounts(full, { ...bank, 500: 18 }), /mehr Bar-an-Bank/);
  assert.match(validateBankNoteCounts(full, { ...bank, 5000: 14 }), /Alle 50-Euro/);
});

test('lässt den Abschluss ausschließlich bei exakt 250 Euro Restbestand zu', () => {
  assert.equal(closingEquationCents({ countedTotalCents: 67_337, bankAmountCents: 42_000, looseChangeCents: 337 }), 25_000);
});

test('berechnet Peters reale Kasse über Bar an Bank korrekt', () => {
  const full = { 1:22, 2:10, 5:34, 10:50, 20:33, 50:5, 100:12, 200:21, 500:17, 1000:19, 2000:13, 5000:15, 10000:0, 20000:0 };
  const bank = { 500:7, 1000:14, 2000:9, 5000:15, 10000:0, 20000:0 };
  const plan = calculateClosingPlan(full);
  assert.equal(plan.countedTotalCents, 135_522);
  assert.equal(plan.retainedCoinCents, 7_000);
  assert.equal(plan.looseChangeCents, 22);
  assert.equal(bankTotalCents(bank), 110_500);
  assert.equal(closingEquationCents({ countedTotalCents:plan.countedTotalCents, bankAmountCents:bankTotalCents(bank), looseChangeCents:plan.looseChangeCents }), 25_000);
});

test('parst EuroControl-Summen centgenau und markiert nur Einzelabweichungen über 5 Euro', () => {
  assert.equal(parseEuroToCents('420,00'), 42_000);
  assert.equal(parseEuroToCents('1.234,56'), 123_456);
  assert.equal(parseEuroToCents('12,345'), null);
  assert.equal(requiresDifferenceNotification(500), false);
  assert.equal(requiresDifferenceNotification(-501), true);
});

