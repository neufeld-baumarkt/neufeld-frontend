import test from 'node:test';
import assert from 'node:assert/strict';
import { berlinBusinessDate, isHistoricalBusinessDate, mayBackfillBusinessDate } from './businessDate.mjs';

test('Geschäftstag wird in Berliner Zeit bestimmt', () => {
  assert.equal(berlinBusinessDate(new Date('2026-10-24T22:30:00.000Z')), '2026-10-25');
});

test('nur Admin und Supervisor dürfen nacherfassen', () => {
  assert.equal(mayBackfillBusinessDate('Admin'), true);
  assert.equal(mayBackfillBusinessDate('Supervisor'), true);
  assert.equal(mayBackfillBusinessDate('Geschäftsführer'), false);
  assert.equal(mayBackfillBusinessDate('Manager-1'), false);
  assert.equal(mayBackfillBusinessDate('Filiale'), false);
});

test('historischer Geschäftstag wird eindeutig erkannt', () => {
  assert.equal(isHistoricalBusinessDate('2026-10-23', '2026-10-25'), true);
  assert.equal(isHistoricalBusinessDate('2026-10-25', '2026-10-25'), false);
  assert.equal(isHistoricalBusinessDate('2026-10-26', '2026-10-25'), false);
});
