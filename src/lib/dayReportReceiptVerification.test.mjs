import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const component = fs.readFileSync(new URL('../components/tageskasse/KassenabrechnungsArchiv.jsx', import.meta.url), 'utf8');

test('der Stempel wird ausschließlich durch den gespeicherten Belegstatus angezeigt', () => {
  assert.match(component, /day\.receiptVerified===true&&/);
  assert.match(component, /report\?\.receiptVerified!==true\|\|!receipt/);
  assert.match(component, /Einzahlungsbeleg verifiziert/);
});

test('die Detailansicht nennt Zeitpunkt und bestätigende Person', () => {
  assert.match(component, /Beleg eingelesen am/);
  assert.match(component, /Eingelesen von/);
  assert.match(component, /receipt\.verifiedAt/);
  assert.match(component, /receipt\.verifiedBy\?\.name/);
});
