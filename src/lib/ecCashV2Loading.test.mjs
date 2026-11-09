import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../components/controlling/EcCashV2Prototype.jsx', import.meta.url),
  'utf8',
);

test('V2 behaelt vorhandene Werte bei stillen Aktualisierungen sichtbar', () => {
  assert.match(source, /const load = useCallback\(async \(\{ showLoading = true \} = \{\}\)/);
  assert.match(source, /if \(showLoading\) setLoading\(true\)/);
  assert.match(source, /await load\(\{ showLoading: false \}\)/);
});
