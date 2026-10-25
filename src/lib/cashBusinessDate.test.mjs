import test from 'node:test';
import assert from 'node:assert/strict';
import { berlinBusinessDate, canSelectHistoricalBusinessDate, formatBusinessDate } from './cashBusinessDate.mjs';

test('ermittelt den Geschäftstag in Europe/Berlin', () => {
  assert.equal(berlinBusinessDate(new Date('2026-10-24T22:30:00.000Z')), '2026-10-25');
});

test('erlaubt Nacherfassung ausschließlich Admin und Supervisor', () => {
  assert.equal(canSelectHistoricalBusinessDate('Admin'), true);
  assert.equal(canSelectHistoricalBusinessDate('Supervisor'), true);
  for (const role of ['Geschäftsführer', 'Manager', 'Manager-1', 'Filialleitung', 'Mitarbeiter']) {
    assert.equal(canSelectHistoricalBusinessDate(role), false);
  }
});

test('formatiert ISO-Geschäftstage ohne Zeitzonenverschiebung', () => {
  assert.match(formatBusinessDate('2026-10-24'), /24\.10\.2026/);
});
