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

test('Sammelüberweisungen starten in Klassik und V2 automatisch den Match und bleiben bei Suchfehlern gespeichert', () => {
  assert.match(classicSource, /Automatischer Match nicht möglich/);
  assert.match(v2Source, /Automatischer Match nicht möglich/);
  assert.match(v2Source, /Match erneut berechnen/);
  assert.match(v2Source, /const result = await request\(\)/);
  assert.match(v2Source, /result\?\.suggestionError/);
});

test('V2 öffnet die Filialdetails beider Zahlungsarten gemeinsam je Geschäftstag', () => {
  assert.match(v2Source, /const \[expandedDate, setExpandedDate\] = useState\(''\)/);
  assert.match(v2Source, /const open = expandedDate === item\.datum/);
  assert.match(v2Source, /setExpandedDate\(open \? '' : item\.datum\)/);
  assert.match(v2Source, /Filialdetails schließen/);
  assert.doesNotMatch(v2Source, /setExpanded\(open \? '' : key\)/);
});

test('V2 bestätigt Kartenarten per Ein-Klick und übernimmt Fortschritt aus dem Backend', () => {
  assert.match(v2Source, /api\(`\/v2\/component-reviews\/\$\{component\.id\}`/);
  assert.match(v2Source, /branch\.componentProgress/);
  assert.match(v2Source, /progress\.confirmed\}\/\{progress\.required\} bestätigt/);
  assert.match(v2Source, /noRevenue \? 'kein Umsatz'/);
  assert.doesNotMatch(v2Source, /components\.reduce\([^\n]*amountCents/);
});

test('V2 zentriert den geöffneten Geschäftstag ausschließlich auf Desktop', () => {
  assert.match(v2Source, /matchMedia\('\(min-width: 1024px\)'\)/);
  assert.match(v2Source, /data-review-date=\{item\.datum\}/);
  assert.match(v2Source, /scrollArea\.scrollTo\(\{ top: Math\.max\(0, centeredTop\), behavior: 'smooth' \}\)/);
  assert.match(v2Source, /groupHeight = lastRect\.bottom - firstRect\.top/);
});

test('V2 verdichtet geschlossene Tageswerte auf Desktop ohne die responsive Darstellung zu erzwingen', () => {
  assert.match(v2Source, /xl:grid-cols-\[115px_minmax\(220px,1fr\)_150px_150px_auto\]/);
  assert.match(v2Source, /md:col-span-2 md:justify-end xl:col-span-1 xl:flex-nowrap/);
  assert.doesNotMatch(v2Source, /Ein Gesamtwert je Tag und Zahlungsart\. Filialdetails bleiben jederzeit einsehbar\./);
  const actionStart = v2Source.indexOf("'Einzelwerte bestätigen'");
  const deferStart = v2Source.indexOf('Später prüfen', actionStart);
  const detailsStart = v2Source.indexOf('Filialen ansehen', deferStart);
  assert.ok(actionStart >= 0 && deferStart > actionStart && detailsStart > deferStart);
});

test('V2 trennt Geschäftstage optisch, hält EC und Kreditkarte desselben Tages aber zusammen', () => {
  assert.match(v2Source, /items\.map\(\(item, index\) =>/);
  assert.match(v2Source, /startsNewDay = index > 0 && items\[index - 1\]\.datum !== item\.datum/);
  assert.match(v2Source, /startsNewDay \? 'mt-2 border-t border-slate-200'/);
  assert.match(v2Source, /bg-slate-100 shadow-sm/);
});

test('Monatsübersicht ordnet jede Statuspille direkt ihrer Zahlungsart zu', () => {
  const start = v2Source.indexOf('function MonthlyValue');
  const end = v2Source.indexOf('export default function EcCashV2Prototype', start);
  const monthlySource = v2Source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(monthlySource, /<MonthlyValue item=\{row\.EC_CASH\}/);
  assert.match(monthlySource, /<MonthlyValue item=\{row\.KREDITKARTE\}/);
  assert.doesNotMatch(monthlySource, />Prüfstatus</);
  assert.match(monthlySource, /colSpan="3"/);
});

test('Monatsübersicht zeigt menschliche und Transferbestätigung gleichzeitig', () => {
  const start = v2Source.indexOf('function MonthlyValue');
  const end = v2Source.indexOf('function MonthlyView', start);
  const valueSource = v2Source.slice(start, end);
  assert.match(valueSource, /item\.confirmationStatuses\?\.length/);
  assert.match(valueSource, /statuses\.map\(\(status\) => <StatusBadge/);
  assert.match(valueSource, /item\.reviewStatus \|\| 'OFFEN'/);
});

test('Monatsübersicht verteilt EC und Kreditkarte gleichmäßig und hält Beträge ausgerichtet', () => {
  const start = v2Source.indexOf('function MonthlyValue');
  const end = v2Source.indexOf('export default function EcCashV2Prototype', start);
  const monthlySource = v2Source.slice(start, end);
  assert.match(monthlySource, /table-fixed/);
  assert.match(monthlySource, /w-\[14%\]/);
  assert.equal((monthlySource.match(/w-\[43%\]/g) || []).length, 2);
  assert.match(monthlySource, /flex flex-wrap items-center justify-start gap-2/);
  assert.match(monthlySource, /font-bold tabular-nums/);
  assert.match(monthlySource, /flex flex-wrap justify-start gap-1/);
  assert.match(monthlySource, /<th className="px-4 py-3">EC-Karten · Qlik<\/th>/);
  assert.match(monthlySource, /<th className="px-4 py-3">Kreditkarten · Qlik<\/th>/);
  assert.doesNotMatch(monthlySource, /grid-cols-\[120px_minmax\(0,1fr\)\]/);
});

test('Sammelüberweisungen bleiben in Klassik und V2 mit Pflichtgrund korrigierbar', () => {
  assert.match(classicSource, /originalBetrag/);
  assert.match(classicSource, /Warum wird der Betrag korrigiert/);
  assert.match(classicSource, /body: JSON\.stringify\(\{ paymentType, datum: row\.datum, amount, reason \}\)/);
  assert.match(v2Source, />Betrag korrigieren<\/button>/);
  assert.match(v2Source, /Warum wird der Betrag korrigiert/);
  assert.match(v2Source, /api\(`\/v2\/transfers\/\$\{id\}`/);
});

test('unbestätigte Sammelüberweisungen sind in Klassik und V2 mit Pflichtgrund löschbar', () => {
  assert.match(classicSource, /Überweisung löschen/);
  assert.match(classicSource, /method: 'DELETE'/);
  assert.match(classicSource, /Warum wird diese Sammelüberweisung gelöscht/);
  assert.match(v2Source, /method: 'DELETE'/);
  assert.match(v2Source, />Löschen<\/button>/);
  assert.match(v2Source, /Bestätigte Matches werden dabei niemals gelöscht/);
});
