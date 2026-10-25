import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bankTotalCents,
  calculateClosingPlan,
  closingEquationCents,
  parseEuroToCents,
  requiresDifferenceNotification,
  suggestFloatNotes,
  validateBankNoteCounts,
} from './kassenabrechnung.mjs';

test('ermittelt Kleingeldentnahme und glatten Startwert für das Hochzählen', () => {
  const plan = calculateClosingPlan({ 1: 7, 10: 3, 50: 2, 100: 4, 200: 19, 500: 20, 1000: 20 });
  assert.equal(plan.coinTotalCents, 4_337);
  assert.equal(plan.retainedCoinCents, 4_000);
  assert.equal(plan.looseChangeCents, 337);
  assert.equal(plan.notesNeededCents, 21_000);
});

test('prüft Bar-an-Bank-Scheine und erlaubt benötigte 50-Euro-Scheine in der Lade', () => {
  const full = { 500: 17, 1000: 19, 2000: 13, 5000: 15, 10000: 0, 20000: 0 };
  const bank = { 500: 7, 1000: 14, 2000: 9, 5000: 15, 10000: 0, 20000: 0 };
  assert.equal(validateBankNoteCounts(full, bank), null);
  assert.equal(bankTotalCents(bank), 110_500);
  assert.match(validateBankNoteCounts(full, { ...bank, 500: 18 }), /mehr Bar-an-Bank/);
  assert.equal(validateBankNoteCounts(full, { ...bank, 5000: 14 }), null);
  assert.match(validateBankNoteCounts({ ...full, 10000: 1 }, { ...bank, 5000: 14, 10000: 0 }), /Alle 100-Euro/);
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

test('schlägt drei Zwanziger und danach möglichst gleich viele Fünfer und Zehner vor', () => {
  const suggestion = suggestFloatNotes({
    notesNeededCents: 18_000,
    fullCounts: { 500: 17, 1_000: 19, 2_000: 13 },
  });
  assert.deepEqual(suggestion, {
    counts: { 500: 8, 1_000: 8, 2_000: 3 },
    totalCents: 18_000,
  });
});

test('passt den Stückelungsvorschlag an den tatsächlich gezählten Bestand an', () => {
  assert.deepEqual(suggestFloatNotes({
    notesNeededCents: 18_000,
    fullCounts: { 500: 20, 1_000: 20, 2_000: 2 },
  })?.counts, { 500: 10, 1_000: 9, 2_000: 2 });
  assert.equal(suggestFloatNotes({
    notesNeededCents: 18_000,
    fullCounts: { 500: 0, 1_000: 0, 2_000: 3 },
  }), null);
});

test('parst EuroControl-Summen centgenau und markiert nur Einzelabweichungen über 5 Euro', () => {
  assert.equal(parseEuroToCents('420,00'), 42_000);
  assert.equal(parseEuroToCents('0,98'), 98);
  assert.equal(parseEuroToCents('0.98'), 98);
  assert.equal(parseEuroToCents('1.234,56'), 123_456);
  assert.equal(parseEuroToCents('1,234.56'), 123_456);
  assert.equal(parseEuroToCents('12,345'), null);
  assert.equal(parseEuroToCents('12.345'), null);
  assert.equal(requiresDifferenceNotification(500), false);
  assert.equal(requiresDifferenceNotification(-501), true);
});

