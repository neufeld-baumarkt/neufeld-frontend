export const HISTORICAL_ENTRY_ROLES = Object.freeze(['Admin', 'Supervisor']);

export function berlinBusinessDate(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(date);
}

export function mayBackfillBusinessDate(role) {
  return HISTORICAL_ENTRY_ROLES.includes(role);
}

export function isHistoricalBusinessDate(businessDate, today = berlinBusinessDate()) {
  return /^\d{4}-\d{2}-\d{2}$/.test(businessDate || '') && businessDate < today;
}
