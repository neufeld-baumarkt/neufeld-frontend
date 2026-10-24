import test from 'node:test';
import assert from 'node:assert/strict';

import { isTrivialPersonalPin, needsPersonalPinSetup, personalPinError } from './employeePinRules.mjs';

test('erkennt ausschließlich 0000 als Standard-PIN', () => {
  assert.equal(needsPersonalPinSetup('0000'), true);
  assert.equal(needsPersonalPinSetup('4711'), false);
});

test('weist gleiche Ziffern und logische Zahlenfolgen als persönliche PINs ab', () => {
  for (const pin of ['1111', '1234', '4567', '9876', '3210', '7890', '2109']) {
    assert.equal(isTrivialPersonalPin(pin), true, pin);
    assert.match(personalPinError(pin, pin), /gleichen Ziffern|Zahlenfolge/, pin);
  }
  for (const pin of ['4711', '1357', '2580']) {
    assert.equal(isTrivialPersonalPin(pin), false, pin);
    assert.equal(personalPinError(pin, pin), null, pin);
  }
});

test('erzwingt einen neuen bestätigten persönlichen PIN', () => {
  assert.match(personalPinError('0000', '0000'), /nicht als persönlicher PIN/);
  assert.match(personalPinError('4711', '4712'), /stimmen nicht überein/);
  assert.equal(personalPinError('4711', '4711'), null);
});
