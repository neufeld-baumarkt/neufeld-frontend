import test from 'node:test';
import assert from 'node:assert/strict';
import { INACTIVITY_TIMEOUT_MS, inactivityState } from './inactivityPolicy.mjs';

test('warnt eine Minute vor dem automatischen Logout', () => {
  assert.deepEqual(inactivityState({ lastActivityAt: 0, now: INACTIVITY_TIMEOUT_MS - 60_001 }), { expired: false, warning: false, remainingSeconds: 61 });
  assert.deepEqual(inactivityState({ lastActivityAt: 0, now: INACTIVITY_TIMEOUT_MS - 60_000 }), { expired: false, warning: true, remainingSeconds: 60 });
});

test('meldet nach exakt 15 Minuten Inaktivität ab', () => {
  assert.deepEqual(inactivityState({ lastActivityAt: 0, now: INACTIVITY_TIMEOUT_MS }), { expired: true, warning: false, remainingSeconds: 0 });
});
