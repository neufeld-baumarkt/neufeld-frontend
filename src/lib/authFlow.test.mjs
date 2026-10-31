import assert from 'node:assert/strict';
import test from 'node:test';
import { destinationAfterLogin, userFromLoginResponse, userFromSessionResponse, validatePasswordChangeForm } from './authFlow.mjs';

test('forced login is routed only to password change', () => {
  assert.equal(destinationAfterLogin({ forcePasswordChange: true }), '/passwort-aendern');
  assert.equal(destinationAfterLogin({ forcePasswordChange: false }), '/start');
  assert.equal(destinationAfterLogin({ forcePasswordChange: true, auth: { forcePasswordChangeMode: 'observe' } }), '/start');
  assert.equal(destinationAfterLogin({ forcePasswordChange: true, auth: { forcePasswordChangeMode: 'guide' } }), '/passwort-aendern');
});

test('old and new auth response shapes are normalized safely', () => {
  const legacy = userFromLoginResponse({ token: 'x', role: 'Admin', name: 'Real Name', filiale: 'Alle' });
  assert.equal(legacy.auth.forcePasswordChangeMode, 'observe');
  const current = userFromLoginResponse({ token: 'x', role: 'Admin', auth: { forcePasswordChangeMode: 'enforce' } });
  assert.equal(current.auth.forcePasswordChangeMode, 'enforce');
  assert.equal(userFromSessionResponse({ user: { role: 'Filiale' }, auth: { tokenMode: 'strict' } }).auth.tokenMode, 'strict');
  assert.equal(userFromLoginResponse({ role: 'Admin' }), null);
});

test('password confirmation and client-side policy are enforced', () => {
  assert.match(validatePasswordChangeForm('long-password-1', 'long-password-2'), /stimmen nicht/);
  assert.match(validatePasswordChangeForm('short', 'short'), /12 bis 128/);
  assert.match(validatePasswordChangeForm('ä'.repeat(37), 'ä'.repeat(37)), /72 UTF-8-Bytes/);
  assert.equal(validatePasswordChangeForm('long-password-1', 'long-password-1'), null);
});
