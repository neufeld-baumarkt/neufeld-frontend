import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('lädt den Tageskontext nach erfolgreichem Abschluss nicht erneut', async () => {
  const modal = await readFile(new URL('../components/tageskasse/TagesabschlussV2Modal.jsx', import.meta.url), 'utf8');

  assert.match(modal, /if \(!loadContext \|\| finalized\) return undefined;/);
  assert.match(modal, /\}, \[finalized, initialDraft, loadContext\]\);/);
});
