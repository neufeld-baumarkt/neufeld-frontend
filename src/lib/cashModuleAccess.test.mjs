import test from 'node:test';
import assert from 'node:assert/strict';
import { canCorrectCashClosing, canUseCashModule, needsTemporaryCashBranch } from './cashModuleAccess.mjs';

test('schaltet den DEV-Prozess nur für Vreden und zentrale Rollen frei', () => {
  assert.equal(canUseCashModule({ role: 'Mitarbeiter', filiale: 'Vreden' }), true);
  assert.equal(canUseCashModule({ role: 'Mitarbeiter', filiale: 'Ahaus' }), false);
  for (const role of ['Admin', 'Supervisor', 'Geschäftsführer', 'Manager-1']) {
    assert.equal(canUseCashModule({ role, filiale: 'Alle' }), true);
  }
});

test('verlangt die temporäre Filialwahl nur bei zentraler Alle-Zuordnung', () => {
  assert.equal(needsTemporaryCashBranch({ role: 'Admin', filiale: 'Alle' }), true);
  assert.equal(needsTemporaryCashBranch({ role: 'Admin', filiale: 'Vreden' }), false);
  assert.equal(needsTemporaryCashBranch({ role: 'Mitarbeiter', filiale: 'Alle' }), false);
});

test('erlaubt Korrekturen ausschließlich den bestätigten Führungsrollen', () => {
  for (const role of ['Filialleitung','Admin','Supervisor','Geschäftsführer','Manager-1','Manager']) {
    assert.equal(canCorrectCashClosing(role),true);
  }
  assert.equal(canCorrectCashClosing('Mitarbeiter'),false);
});
