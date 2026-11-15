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
const classicSource = await readFile(
  new URL('../components/controlling/EcCashModal.jsx', import.meta.url),
  'utf8'
);

test('Modul 2 startet bei jedem Öffnen in der klassischen Ansicht', () => {
  assert.match(moduleSource, /useState\(CLASSIC_VIEW\)/);
  assert.match(moduleSource, /activeView === CLASSIC_VIEW \? \(/);
  assert.match(moduleSource, /<EcCashModal \/>/);
});
test('klassische Ansicht startet im aktuellen Monat und benennt IST und SOLL eindeutig', () => {
  assert.match(classicSource, /function getCurrentMonth\(\)/);
  assert.match(classicSource, /new Date\(\)\.getMonth\(\) \+ 1/);
  assert.match(classicSource, /useState\(getCurrentMonth\)/);
  assert.match(classicSource, /\{branch\.label\}[\s\S]*IST · Match-Engine[\s\S]*SOLL · Qlik/);
});

test('beide Ansichten bieten den eindeutigen Wechsel an', () => {
  assert.match(moduleSource, /Zur V2-Ansicht wechseln/);
  assert.match(moduleSource, /onSwitchToClassic=\{\(\) => setActiveView\(CLASSIC_VIEW\)\}/);
  assert.match(v2Source, /Zur klassischen Ansicht wechseln/);
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
});

test('V2 trennt den festen Arbeitskopf vollständig vom scrollenden Inhalt', () => {
  assert.doesNotMatch(v2Source, /sticky top-/);
  assert.match(v2Source, /flex h-full min-h-0 flex-col overflow-hidden rounded-2xl/);
  assert.match(v2Source, /shrink-0 overflow-hidden rounded-t-2xl border-b-\[3px\] border-\[#800000\]/);
  assert.match(v2Source, /<main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-7">/);
  assert.match(hubSource, /openModule\.id === 'ecCashKreditkarte' \? 'overflow-hidden px-6 pb-6 pt-1' : 'overflow-auto p-6'/);
  assert.match(moduleSource, /<div className="h-full overflow-auto pt-5">[\s\S]*<ViewSwitcher/);
  assert.match(v2Source, /<SummaryCards summary=\{summary\} \/>/);
  assert.doesNotMatch(v2Source, /Der Tagesabschluss bleibt immer frei/);
  assert.doesNotMatch(v2Source, /Qlik liefert die Werte\. Alex und Mirko prüfen bewusst\./);
});

test('Geldbeträge werden in V2 ohne Vorzeichen formatiert', () => {
  assert.match(v2Source, /Math\.abs\(Number\(cents\) \|\| 0\)/);
  assert.match(v2Source, /Beträge werden bewusst ohne Vorzeichen dargestellt/);
});

test('klassische Gesamtüberweisungen sind bearbeitbar und werden gespeichert', () => {
  assert.match(classicSource, /onTransferChange=\{updateLocalTransfer\}/);
  assert.match(classicSource, /onTransferCommit=\{saveClassicTransfer\}/);
  assert.match(classicSource, /api\/controlling\/transfers\/classic/);
  assert.doesNotMatch(classicSource, /value=\{formatMoneyValue\(getTransferValue\(row\)\}\s+disabled\s*\/>/);
});

test('Klassik und V2 verwenden dieselben anbieterspezifischen Sammelüberweisungen', () => {
  assert.match(v2Source, /\['FirstData', 'TeleCash'\]/);
  assert.match(classicSource, /api\/controlling\/transfers\/classic/);
});

test('klassische Qlik-Werte wechseln per Ein-Klick von orange auf bestätigt', () => {
  assert.match(classicSource, /CONFIRMED_REVIEW_STATUSES/);
  assert.match(classicSource, /text-orange-600/);
  assert.match(classicSource, /onClick=\{\(\) => onConfirmQlik/);
  assert.match(classicSource, /api\/controlling\/payment-days\/\$\{cell\.id\}\/review/);
  assert.match(classicSource, /method: 'PATCH'/);
  assert.match(classicSource, /reviewStatus: 'BESTAETIGT'/);
  assert.match(classicSource, /Durch bestätigten Match befüllt/);
  assert.match(classicSource, /formatMoneyDisplay\(cell\.istBetrag\)/);
  assert.doesNotMatch(classicSource, /field: 'istBetrag'/);
});
