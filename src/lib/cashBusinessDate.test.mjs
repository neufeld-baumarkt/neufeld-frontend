import test from 'node:test';
import assert from 'node:assert/strict';
import { berlinBusinessDate, canSelectHistoricalBusinessDate, formatBusinessDate } from './cashBusinessDate.mjs';

test('ermittelt den Geschäftstag in Europe/Berlin', () => {
  assert.equal(berlinBusinessDate(new Date('2026-10-24T22:30:00.000Z')), '2026-10-25');
});

test('erlaubt Nacherfassung für Admin, Supervisor und die drei benannten Führungskräfte', () => {
  assert.equal(canSelectHistoricalBusinessDate('Admin'), true);
  assert.equal(canSelectHistoricalBusinessDate('Supervisor'), true);
  for (const user of [
    { name: 'Alex Neufeld', role: 'Geschäftsführer' },
    { name: 'Gökhan Genc', role: 'Manager-1' },
    { name: 'Jörg Menkehorst', role: 'Manager-1' },
  ]) {
    assert.equal(canSelectHistoricalBusinessDate(user), true);
  }
});

test('zeigt die Datumsauswahl nicht bei gleichen Rollen oder falscher Zuordnung', () => {
  for (const user of [
    { name: 'Andere Geschäftsführung', role: 'Geschäftsführer' },
    { name: 'Andere Leitung', role: 'Manager-1' },
    { name: 'Alex Neufeld', role: 'Manager-1' },
    { name: 'Gökhan Genc', role: 'Geschäftsführer' },
    { name: 'Jörg Menkehorst', role: 'Filialleitung' },
  ]) {
    assert.equal(canSelectHistoricalBusinessDate(user), false);
  }
});

test('formatiert ISO-Geschäftstage ohne Zeitzonenverschiebung', () => {
  assert.match(formatBusinessDate('2026-10-24'), /24\.10\.2026/);
});
