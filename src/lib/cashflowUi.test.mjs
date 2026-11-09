import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculatePlannedInvoiceAmount,
  getCashflowDetailBookings,
  getIsoDateParts,
} from './cashflowUi.mjs';

test('Kalenderauswahl setzt ISO-Jahr, Kalenderwoche und Wochentag atomar', () => {
  assert.deepEqual(getIsoDateParts(new Date(2027, 0, 1)), {
    jahr: 2026,
    kw: 53,
    tag: 'Fr',
  });
  assert.deepEqual(getIsoDateParts(new Date(2026, 10, 2)), {
    jahr: 2026,
    kw: 45,
    tag: 'Mo',
  });
});

test('Skontovorschau rechnet centgenau', () => {
  assert.equal(calculatePlannedInvoiceAmount(1000, 3), 970);
  assert.equal(calculatePlannedInvoiceAmount(19.99, 3), 19.39);
});

test('Tagesansicht zeigt weiterhin alle Buchungen der Zelle', () => {
  const bookings = [{ id: 17 }, { id: 18 }];

  assert.equal(getCashflowDetailBookings(bookings), bookings);
});

test('Bearbeiten aus der Rechnungssuche zeigt nur den exakten Treffer', () => {
  const bookings = [
    { id: 17, rechnungsnummer: 'RE-100' },
    { id: 18, rechnungsnummer: 'RE-101' },
  ];

  assert.deepEqual(getCashflowDetailBookings(bookings, '18'), [bookings[1]]);
});
