import { CASH_DENOMINATIONS, TARGET_CENTS, countCashCents } from './kasseneinzaehlung.mjs';

export const FLOAT_NOTE_CENTS = Object.freeze([500, 1_000, 2_000]);
export const BANK_NOTE_CENTS = Object.freeze([500, 1_000, 2_000, 5_000, 10_000, 20_000]);

function safeQuantity(value) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 0 ? quantity : 0;
}

export function parseEuroToCents(value) {
  const normalized = String(value ?? '').trim().replace(/\s/g, '').replace('.', '').replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export function calculateClosingPlan(fullCounts = {}) {
  const countedTotalCents = countCashCents(fullCounts);
  const coinTotalCents = CASH_DENOMINATIONS
    .filter(({ cents }) => cents <= 200)
    .reduce((sum, { cents }) => sum + cents * safeQuantity(fullCounts[cents]), 0);
  const retainedCoinCents = Math.min(Math.floor(coinTotalCents / 500) * 500, TARGET_CENTS);
  const looseChangeCents = coinTotalCents - retainedCoinCents;
  return {
    countedTotalCents,
    coinTotalCents,
    retainedCoinCents,
    looseChangeCents,
    notesNeededCents: TARGET_CENTS - retainedCoinCents,
  };
}

export function retainedNotesTotalCents(retainedNoteCounts = {}) {
  return FLOAT_NOTE_CENTS.reduce(
    (sum, cents) => sum + cents * safeQuantity(retainedNoteCounts[cents]),
    0,
  );
}

export function validateRetainedNotes(fullCounts = {}, retainedNoteCounts = {}, notesNeededCents) {
  for (const cents of FLOAT_NOTE_CENTS) {
    if (safeQuantity(retainedNoteCounts[cents]) > safeQuantity(fullCounts[cents])) {
      return `Es können nicht mehr ${cents / 100}-Euro-Scheine in der Lade bleiben als gezählt wurden.`;
    }
  }
  const retainedTotal = retainedNotesTotalCents(retainedNoteCounts);
  if (retainedTotal !== Number(notesNeededCents)) {
    return `Mit den ausgewählten Scheinen fehlen noch ${(Number(notesNeededCents) - retainedTotal) / 100} Euro bis 250 Euro.`;
  }
  return null;
}

export function expectedBankNoteCounts(fullCounts = {}, retainedNoteCounts = {}) {
  return Object.fromEntries(BANK_NOTE_CENTS.map((cents) => [
    cents,
    safeQuantity(fullCounts[cents]) - (FLOAT_NOTE_CENTS.includes(cents) ? safeQuantity(retainedNoteCounts[cents]) : 0),
  ]));
}

export function bankTotalCents(bankNoteCounts = {}) {
  return BANK_NOTE_CENTS.reduce((sum, cents) => sum + cents * safeQuantity(bankNoteCounts[cents]), 0);
}

export function bankCountDifferences(fullCounts = {}, retainedNoteCounts = {}, bankNoteCounts = {}) {
  const expected = expectedBankNoteCounts(fullCounts, retainedNoteCounts);
  return BANK_NOTE_CENTS.filter((cents) => safeQuantity(bankNoteCounts[cents]) !== expected[cents])
    .map((cents) => ({ cents, expected: expected[cents], actual: safeQuantity(bankNoteCounts[cents]) }));
}

export function closingEquationCents({ countedTotalCents, bankAmountCents, looseChangeCents }) {
  return Number(countedTotalCents) - Number(bankAmountCents) - Number(looseChangeCents);
}

export function requiresDifferenceNotification(differenceCents) {
  return Math.abs(Number(differenceCents) || 0) > 500;
}

