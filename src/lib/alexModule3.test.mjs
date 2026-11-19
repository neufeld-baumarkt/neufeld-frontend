import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const component = fs.readFileSync(path.join(here, '..', 'components', 'controlling', 'AlexModule3.jsx'), 'utf8');
const preview = fs.readFileSync(path.join(here, '..', 'components', 'controlling', 'AlexModule3Preview.jsx'), 'utf8');
const hub = fs.readFileSync(path.join(here, '..', 'components', 'cashflow', 'AlexCashflowHub.jsx'), 'utf8');

test('Alex 3 exposes synchronized classic and V2 views', () => {
  assert.match(component, /Klassische Excel-Ansicht/);
  assert.match(component, /Geführte V2-Prüfansicht/);
  assert.match(component, /\/api\/controlling\/alex3\/month/);
  assert.match(component, /\/api\/controlling\/alex3\/manual-values/);
  assert.match(component, /\/alex3\/qlik-values\/\$\{encodeURIComponent\(qlikValueId\)\}\/confirm/);
  assert.match(component, /SOLL – via Qlik/);
  assert.match(component, /IST – via Tagesabrechnung/);
  assert.match(component, /Plausibel · Beleg offen/);
  assert.match(component, /Unplausible Abweichung/);
  assert.doesNotMatch(component, /Tresorabschöpfung:/);
});

test('classic and V2 use the same orange confirmation semantics', () => {
  assert.match(component, /Qlik-Wert vorhanden · Controllerbestätigung offen/);
  assert.match(component, /Tagesabrechnung vorhanden · Einzahlungsbeleg offen/);
  assert.match(component, /Orange = Bestätigung offen · Schwarz = bestätigt/);
  assert.match(component, /Ein unplausibler Unterschied löst bereits vor dem Einzahlungsbeleg Alarm aus/);
});

test('Alex hub opens the new module instead of the old BaB report', () => {
  assert.match(hub, /import AlexModule3 from/);
  assert.match(hub, /<AlexModule3 year=\{jahr\}/);
  assert.doesNotMatch(hub, /<BabEzAzReport/);
  assert.match(preview, /Qlik ↔ Tageskasse/);
});
