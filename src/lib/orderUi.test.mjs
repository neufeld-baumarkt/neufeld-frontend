import test from 'node:test';
import assert from 'node:assert/strict';
import { compactSplitPayload, dateInBerlin, normalizeSupplierCode, orderMeetsMinimumVe } from './orderUi.mjs';

test('supplier codes are case independent', () => {
  assert.equal(normalizeSupplierCode(' MELLERUD '), 'mellerud');
});

test('Berlin business date does not use the previous UTC day after local midnight', () => {
  assert.equal(dateInBerlin(new Date('2026-07-01T22:30:00.000Z')), '2026-07-02');
  assert.equal(dateInBerlin(new Date('2026-01-01T23:30:00.000Z')), '2026-01-02');
});

test('minimum VE applies to the whole order', () => {
  assert.equal(orderMeetsMinimumVe(1, 2), false);
  assert.equal(orderMeetsMinimumVe(2, 2), true);
});

test('split payload contains only user intent, never client-calculated money', () => {
  assert.deepEqual(compactSplitPayload({
    article: { zeilen: [{ target_filiale: 'Münster', einheit: 'stueck', menge: '3', betrag_netto_berechnet: 999 }] },
  }), {
    article: { zeilen: [{ target_filiale: 'Münster', einheit: 'stueck', menge: 3 }] },
  });
});
