import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Einzählungsadapter übernimmt den bereits bestätigten Proof-Token ohne countedBy-Zugriff', async () => {
  const source = await readFile(new URL('./kasseneinzaehlungApi.js', import.meta.url), 'utf8');
  assert.match(source, /proofToken: attempt\.proofToken/);
  assert.doesNotMatch(source, /attempt\.countedBy\.proofToken/);
});

test('Einzählungsmodal sendet den Backend-Vertrag mit counts und proofToken', async () => {
  const source = await readFile(new URL('../components/tageskasse/KasseneinzaehlModal.jsx', import.meta.url), 'utf8');
  assert.match(source, /return \{ counts: attempt\.denominationCounts, proofToken \}/);
  assert.match(source, /bg-\[#f7f4ef\] text-black shadow-2xl/);
});
