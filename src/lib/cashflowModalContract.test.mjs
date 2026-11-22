import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const modalPath = path.join(currentDir, '..', 'components', 'cashflow', 'CashflowCellDetailModal.jsx');
const source = fs.readFileSync(modalPath, 'utf8');

test('Cashflow-Detail schließt nicht mehr durch einen versehentlichen Außenklick', () => {
  assert.doesNotMatch(source, /event\.target === event\.currentTarget/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-label="Fenster schließen"/);
  assert.match(source, /onClick=\{requestClose\}/);
});

test('Kategorie-Korrektur und vergrößerter OK-Button bleiben sichtbar', () => {
  assert.match(source, />\s*Kategorie korrigieren\s*</);
  assert.match(source, /kategorie_id: Number\(selectedBuchung\.editKategorieId\)/);
  assert.match(source, /min-h-14 min-w-32/);
});
