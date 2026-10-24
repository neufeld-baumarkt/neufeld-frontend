export const TARGET_CENTS = 25_000;

export const CASH_DENOMINATIONS = [
  { cents: 1, label: '1 ct' },
  { cents: 2, label: '2 ct' },
  { cents: 5, label: '5 ct' },
  { cents: 10, label: '10 ct' },
  { cents: 20, label: '20 ct' },
  { cents: 50, label: '50 ct' },
  { cents: 100, label: '1 €' },
  { cents: 200, label: '2 €' },
  { cents: 500, label: '5 €' },
  { cents: 1_000, label: '10 €' },
  { cents: 2_000, label: '20 €' },
  { cents: 5_000, label: '50 €' },
  { cents: 10_000, label: '100 €' },
  { cents: 20_000, label: '200 €' },
];

export function countCashCents(counts = {}) {
  return CASH_DENOMINATIONS.reduce((sum, denomination) => {
    const quantity = Number(counts[denomination.cents]);
    return sum + denomination.cents * (Number.isInteger(quantity) && quantity >= 0 ? quantity : 0);
  }, 0);
}

export function openingDifferenceCents(countedCents) {
  return Number(countedCents || 0) - TARGET_CENTS;
}

export function matchesImmediatePreviousClosing({ branch, drawerNumber, openingDifference, previousClosing }) {
  if (!previousClosing || previousClosing.status !== 'closed') return false;
  if (previousClosing.branch !== branch || Number(previousClosing.drawerNumber) !== Number(drawerNumber)) return false;
  if (previousClosing.resolved === true || Number(previousClosing.differenceCents) === 0) return false;
  return Number(previousClosing.differenceCents) === -Number(openingDifference);
}

export function nextDifferenceStep(completedAttempts) {
  if (completedAttempts <= 0) return 'same-person-recount';
  if (completedAttempts === 1) return 'recommend-other-person';
  return 'adjust-to-target';
}

export function formatEuroFromCents(cents, { signed = false } = {}) {
  const value = Number(cents || 0) / 100;
  const prefix = signed && value > 0 ? '+' : '';
  return `${prefix}${value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;
}
