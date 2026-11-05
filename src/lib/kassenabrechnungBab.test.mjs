import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('fragt nur die aufgelaufene BaB-Gesamtsumme mit Ja oder Nein ab', async () => {
  const modal = await readFile(new URL('../components/tageskasse/KassenabrechnungsModal.jsx', import.meta.url), 'utf8');

  assert.match(modal, /BaB gesamt bis einschließlich dieser Kasse/);
  assert.match(modal, /Jo, passt!/);
  assert.match(modal, /Neee, passt nicht!/);
  assert.doesNotMatch(modal, /Übernimm jetzt die BaB-Summe dieser einzelnen Kasse/);
});

test('erfasst bei einer Abweichung den EuroControl-Gesamtwert und warnt Peter anzurufen', async () => {
  const modal = await readFile(new URL('../components/tageskasse/KassenabrechnungsModal.jsx', import.meta.url), 'utf8');

  assert.match(modal, /Peter unbedingt anrufen!/);
  assert.match(modal, /Aufgelaufenes BaB laut EuroControl/);
  assert.match(modal, /cumulativeBabEurocontrolCents/);
});
