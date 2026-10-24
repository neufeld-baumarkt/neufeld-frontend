import { CASH_DENOMINATIONS, TARGET_CENTS, countCashCents } from './kasseneinzaehlung.mjs';

export const BANK_NOTE_CENTS = Object.freeze([500, 1_000, 2_000, 5_000, 10_000, 20_000]);
export const BANK_ONLY_NOTE_CENTS = Object.freeze([5_000, 10_000, 20_000]);
export const FLOAT_NOTE_CENTS = Object.freeze([500, 1_000, 2_000]);

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

export function bankTotalCents(bankNoteCounts = {}) {
  return BANK_NOTE_CENTS.reduce((sum, cents) => sum + cents * safeQuantity(bankNoteCounts[cents]), 0);
}

export function suggestFloatNotes({ notesNeededCents, fullCounts = {} }) {
  const amount = Number(notesNeededCents);
  if (!Number.isInteger(amount) || amount < 0 || amount % 500 !== 0) return null;
  const targetTwentyCount = Math.min(3, Math.floor(amount / 2_000));
  let best = null;

  for (let twenties = 0; twenties <= Math.min(safeQuantity(fullCounts[2_000]), Math.floor(amount / 2_000)); twenties += 1) {
    const afterTwenties = amount - twenties * 2_000;
    for (let tens = 0; tens <= Math.min(safeQuantity(fullCounts[1_000]), Math.floor(afterTwenties / 1_000)); tens += 1) {
      const afterTens = afterTwenties - tens * 1_000;
      if (afterTens % 500 !== 0) continue;
      const fives = afterTens / 500;
      if (fives > safeQuantity(fullCounts[500])) continue;
      const score = [
        Math.abs(twenties - targetTwentyCount),
        Math.abs(fives - tens),
        twenties > targetTwentyCount ? 1 : 0,
        fives + tens + twenties,
      ];
      if (!best || score.some((value, index) => value < best.score[index] && score.slice(0, index).every((entry, earlier) => entry === best.score[earlier]))) {
        best = { score, counts: { 500: fives, 1_000: tens, 2_000: twenties } };
      }
    }
  }

  return best ? { counts: best.counts, totalCents: amount } : null;
}

export function validateBankNoteCounts(fullCounts = {}, bankNoteCounts = {}) {
  for (const cents of BANK_NOTE_CENTS) {
    if (safeQuantity(bankNoteCounts[cents]) > safeQuantity(fullCounts[cents])) {
      return `Bei ${cents / 100} Euro wurden mehr Bar-an-Bank-Scheine eingetragen als zuvor gezählt.`;
    }
  }
  for (const cents of BANK_ONLY_NOTE_CENTS) {
    if (safeQuantity(bankNoteCounts[cents]) !== safeQuantity(fullCounts[cents])) {
      return `Alle ${cents / 100}-Euro-Scheine müssen als Bar an Bank erfasst werden.`;
    }
  }
  return null;
}

export function closingEquationCents({ countedTotalCents, bankAmountCents, looseChangeCents }) {
  return Number(countedTotalCents) - Number(bankAmountCents) - Number(looseChangeCents);
}

export function requiresDifferenceNotification(differenceCents) {
  return Math.abs(Number(differenceCents) || 0) > 500;
}

