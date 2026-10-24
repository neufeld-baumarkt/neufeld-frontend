export const CASH_CENTRAL_ROLES = Object.freeze(['Admin', 'Supervisor', 'Geschäftsführer', 'Manager-1', 'Manager']);

export function isCashCentralRole(role) {
  return CASH_CENTRAL_ROLES.includes(String(role || '').trim());
}

export function canUseCashModule(user = {}) {
  return isCashCentralRole(user.role) || String(user.filiale || '').trim().toLocaleLowerCase('de-DE') === 'vreden';
}

export function needsTemporaryCashBranch(user = {}) {
  return isCashCentralRole(user.role) && String(user.filiale || '').trim().toLocaleLowerCase('de-DE') === 'alle';
}
