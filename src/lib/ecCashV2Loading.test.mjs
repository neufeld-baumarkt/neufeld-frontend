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

test('V2 benennt Match-Einträge als Filial-Tageswerte und bietet bestätigte Matches nicht erneut an', () => {
  assert.match(source, /Filial-Tageswerte vorgeschlagen/);
  assert.match(source, /\['vorgeschlagen', 'vertagt'\]\.includes\(row\.match_status\)/);
  assert.match(source, /Zuordnung abgeschlossen/);
});

test('V2 blendet umsatzlose Tage auch bei einer veralteten Backend-Antwort aus', () => {
  assert.match(source, /Number\(item\?\.qlikTotalCents\) > 0/);
  assert.match(source, /setOverview\(withPositiveRevenueItems\(o\)\)/);
});

test('V2 ordnet den Dienstleister fest über die Zahlungsart zu', () => {
  assert.match(source, /EC_CASH: 'TeleCash'/);
  assert.match(source, /KREDITKARTE: 'FirstData'/);
  assert.doesNotMatch(source, /value=\{form\.provider\}/);
  assert.match(source, /Dienstleister/);
});

test('V2 lässt den exakten Differenz-Ausgleich ausschließlich bewusst bestätigen', () => {
  assert.match(source, /Exakter Ausgleich gefunden/);
  assert.match(source, /Fehlbetrag vorgemerkt/);
  assert.match(source, /exakte positive Gegenbuchung/);
  assert.match(source, /settleCarryId: carrySuggestion\.id/);
  assert.match(source, /Ausgleichen &amp; bestätigen/);
  assert.match(source, /Centgenau ausgeglichen/);
  assert.match(source, /Ursprünglich \{euro\(row\.rawDifferenzCents\)\}/);
});
