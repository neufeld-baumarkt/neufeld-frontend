import test from 'node:test';
import assert from 'node:assert/strict';
import { activeOpeningForDrawer, replacementOpeningId, replacementStage } from './kassenladenAbloesung.mjs';

test('belegte Lade öffnet die verbindliche Ablöseentscheidung', () => {
  const active = activeOpeningForDrawer([
    { id: 11, drawerNumber: 1, lifecycleStatus: 'active' },
    { id: 12, drawerNumber: 2, lifecycleStatus: 'replaced' },
  ], 1);
  assert.equal(active?.id, 11);
  assert.equal(replacementStage(active), 'occupied-drawer');
  assert.equal(replacementStage(null), 'count');
});

test('Ablöse-ID wird erst nach ausdrücklicher Auswahl übertragen', () => {
  const active = { id: 11, drawerNumber: 1 };
  assert.equal(replacementOpeningId(active, false), null);
  assert.equal(replacementOpeningId(active, true), 11);
});
