import test from 'node:test';
import assert from 'node:assert/strict';
import { canCorrectCashClosing, canUseCashModule, needsTemporaryCashBranch } from './cashModuleAccess.mjs';

test('schaltet den Prozess für alle vier Filialen und zentrale Rollen frei', () => {
  for (const filiale of ['Ahaus', 'Münster', 'Telgte', 'Vreden']) {
    assert.equal(canUseCashModule({ role: 'Mitarbeiter', filiale }), true);
  }
  assert.equal(canUseCashModule({ role: 'Mitarbeiter', filiale: 'Alle' }), false);
  assert.equal(canUseCashModule({ role: 'Mitarbeiter' }), false);
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
