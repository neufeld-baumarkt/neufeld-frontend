import assert from 'node:assert/strict';
import test from 'node:test';
import { buildActionPayload, parseActionNumber } from './actionCreate.mjs';

test('accepts a real action format and derives year and week', () => {
  assert.deepEqual(parseActionNumber(' a02713 '), {
    ok: true,
    aktion_nr: 'A02713',
    jahr: 2027,
    kw: 13
  });
});

test('rejects fantasy action prefixes and invalid weeks', () => {
  assert.equal(parseActionNumber('X02713').ok, false);
  assert.equal(parseActionNumber('A02754').ok, false);
});

test('requires an amount for every selected branch and omits unchecked branches', () => {
  const missing = buildActionPayload('S02637', [
    { name: 'Ahaus', enabled: true, amount: '' },
    { name: 'Vreden', enabled: false, amount: '' }
  ]);
  assert.equal(missing.ok, false);
  assert.match(missing.message, /Ahaus/);

  const valid = buildActionPayload('S02637', [
    { name: 'Ahaus', enabled: true, amount: '1.234,56' },
    { name: 'Vreden', enabled: false, amount: '' }
  ]);
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.payload.filialen, [{ filiale: 'Ahaus', betrag: 1234.56 }]);
});

test('adds a trimmed optional remark and omits an empty one', () => {
  const rows = [{ name: 'Ahaus', enabled: true, amount: '10' }];

  const withRemark = buildActionPayload('A02645', rows, '  Aufbau am Eingang  ');
  assert.equal(withRemark.payload.beschreibung, 'Aufbau am Eingang');

  const withoutRemark = buildActionPayload('A02645', rows, '   ');
  assert.equal('beschreibung' in withoutRemark.payload, false);
});
