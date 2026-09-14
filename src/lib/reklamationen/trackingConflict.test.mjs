import assert from 'node:assert/strict';
import test from 'node:test';

import { getTrackingConflictAlert } from './trackingConflict.mjs';

test('creates a blocking, actionable message for a duplicate tracking ID', () => {
  const error = {
    response: {
      status: 409,
      data: { code: 'TRACKING_ID_EXISTS' },
    },
  };

  const message = getTrackingConflictAlert(error, ' 00000 ');

  assert.match(message, /BUCHUNG NICHT MÖGLICH/);
  assert.match(message, /"00000" wurde bereits/);
  assert.match(message, /nur einmal/);
  assert.match(message, /mit OK/);
  assert.match(message, /eindeutige Tracking-ID/);
});

test('does not replace notifications for unrelated errors', () => {
  assert.equal(
    getTrackingConflictAlert({ response: { status: 409, data: { code: 'REKLA_NR_EXISTS' } } }, '00000'),
    null
  );
  assert.equal(
    getTrackingConflictAlert({ response: { status: 500, data: { code: 'TRACKING_ID_EXISTS' } } }, '00000'),
    null
  );
});
