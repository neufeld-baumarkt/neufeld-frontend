import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const modalPath = path.join(here, '..', 'components', 'cashflow', 'CashflowWeekDetailModal.jsx');
const modal = fs.readFileSync(modalPath, 'utf8');

test('Cashflow search offers amount suggestions for invoices and full Avis groups', () => {
  assert.match(modal, /selectSearchMode\('betrag'\)/);
  assert.match(modal, /inputMode=\{searchMode === 'betrag' \? 'decimal' : 'text'\}/);
  assert.match(modal, /z\. B\. 1\.234,56/);
  assert.match(modal, /&typ=\$\{searchMode\}/);
  assert.match(modal, /Keine Einzelrechnung oder vollständige Avis-Summe/);
  assert.match(modal, /rechnung\.suchbetrag \?\? rechnung\.betrag/);
});
