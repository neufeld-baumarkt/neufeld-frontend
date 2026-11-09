export const CASH_CENTRAL_ROLES = Object.freeze(['Admin', 'Supervisor', 'Geschäftsführer', 'Manager-1', 'Manager']);
export const CASH_CORRECTION_ROLES = Object.freeze(['Filialleitung', ...CASH_CENTRAL_ROLES]);
const ENABLED_CASH_BRANCHES = new Set(['ahaus', 'vreden']);

export function isCashCentralRole(role) {
  return CASH_CENTRAL_ROLES.includes(String(role || '').trim());
}

export function canUseCashModule(user = {}) {
  return isCashCentralRole(user.role)
    || ENABLED_CASH_BRANCHES.has(String(user.filiale || '').trim().toLocaleLowerCase('de-DE'));
}

export function needsTemporaryCashBranch(user = {}) {
  return isCashCentralRole(user.role) && String(user.filiale || '').trim().toLocaleLowerCase('de-DE') === 'alle';
}

export function canCorrectCashClosing(role) {
  return CASH_CORRECTION_ROLES.includes(String(role || '').trim());
}
