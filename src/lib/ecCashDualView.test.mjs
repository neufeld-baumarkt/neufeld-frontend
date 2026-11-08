import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const moduleSource = await readFile(
  new URL('../components/controlling/EcCashModule.jsx', import.meta.url),
  'utf8'
);
const hubSource = await readFile(
  new URL('../components/cashflow/AlexCashflowHub.jsx', import.meta.url),
  'utf8'
);
const v2Source = await readFile(
  new URL('../components/controlling/EcCashV2Prototype.jsx', import.meta.url),
  'utf8'
);

test('Modul 2 startet bei jedem Öffnen in der klassischen Ansicht', () => {
  assert.match(moduleSource, /useState\(CLASSIC_VIEW\)/);
  assert.match(moduleSource, /activeView === CLASSIC_VIEW \? <EcCashModal \/> : <EcCashV2Prototype \/>/);
});

test('beide Ansichten bieten den eindeutigen Wechsel an', () => {
  assert.match(moduleSource, /Zur V2-Ansicht wechseln/);
  assert.match(moduleSource, /Zur klassischen Ansicht wechseln/);
});

test('V2 ist in Modul 2 gebündelt und Prognosen bleibt ein eigener Platzhalter', () => {
  assert.match(hubSource, /import EcCashModule from '\.\.\/controlling\/EcCashModule'/);
  assert.match(hubSource, /openModule\.id === 'ecCashKreditkarte' && <EcCashModule \/>/);
  assert.doesNotMatch(hubSource, /openModule\.id === 'prognosen' && <EcCashV2Prototype/);
});

test('V2 führt sichtbar durch Prüfung, Zuordnung und Monatsübersicht', () => {
  assert.match(v2Source, /Qlik-Werte prüfen/);
  assert.match(v2Source, /Überweisungen zuordnen/);
  assert.match(v2Source, /Monat überblicken/);
  assert.match(v2Source, /Der Tagesabschluss bleibt immer frei/);
});

test('Geldbeträge werden in V2 ohne Vorzeichen formatiert', () => {
  assert.match(v2Source, /Math\.abs\(Number\(cents\) \|\| 0\)/);
  assert.match(v2Source, /Beträge werden bewusst ohne Vorzeichen dargestellt/);
});
