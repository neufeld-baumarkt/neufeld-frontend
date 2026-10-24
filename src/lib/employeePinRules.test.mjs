import test from 'node:test';
import assert from 'node:assert/strict';

import { needsPersonalPinSetup, personalPinError } from './employeePinRules.mjs';

test('erkennt ausschließlich 0000 als Standard-PIN', () => {
  assert.equal(needsPersonalPinSetup('0000'), true);
  assert.equal(needsPersonalPinSetup('4711'), false);
});

test('erzwingt einen neuen bestätigten persönlichen PIN', () => {
  assert.match(personalPinError('0000', '0000'), /nicht als persönlicher PIN/);
  assert.match(personalPinError('4711', '4712'), /stimmen nicht überein/);
  assert.equal(personalPinError('4711', '4711'), null);
});
