export const CASH_BUSINESS_DATE_KEY = 'cash-business-date';

export function berlinBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

const HISTORICAL_DATE_USERS = new Map([
  ['alex neufeld', 'Geschäftsführer'],
  ['gökhan genc', 'Manager-1'],
  ['jörg menkehorst', 'Manager-1'],
]);

function normalizeUserName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de-DE');
}

export function canSelectHistoricalBusinessDate(userOrRole) {
  const user = typeof userOrRole === 'object' && userOrRole !== null
    ? userOrRole
    : { role: userOrRole };
  const role = String(user.role || '').trim();
  if (['Admin', 'Supervisor'].includes(role)) return true;
  return HISTORICAL_DATE_USERS.get(normalizeUserName(user.name)) === role;
}

export function formatBusinessDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function activeCashBusinessDate() {
  if (typeof sessionStorage === 'undefined') return '';
  return sessionStorage.getItem(CASH_BUSINESS_DATE_KEY) || '';
}

export function setActiveCashBusinessDate(value) {
  if (typeof sessionStorage === 'undefined') return;
  if (value) sessionStorage.setItem(CASH_BUSINESS_DATE_KEY, value);
  else sessionStorage.removeItem(CASH_BUSINESS_DATE_KEY);
}
