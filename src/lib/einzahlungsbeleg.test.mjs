import assert from 'node:assert/strict';
import test from 'node:test';
import {
  matchingClosingSets,
  parseDepositReceiptText,
  receiptBanknoteTotalCents,
  validateReceiptReview,
} from './einzahlungsbeleg.mjs';

const receipt = `Quittungsbeleg für Bargeldeinzahlung
Datum Uhrzeit Tx-Nr Terminal
03.02.99 09:07 00123456 00009999
eingezahlte Noten:
10,00 EUR * 5 = 50,00 EUR
20,00 EUR * 10 = 200,00 EUR
50,00 EUR * 5 = 250,00 EUR
Summe = 500,00 EUR`;

test('parses a receipt without a purpose', () => {
  const parsed = parseDepositReceiptText(receipt);
  assert.equal(parsed.depositDate, '2099-02-03');
  assert.equal(parsed.purpose, '');
  assert.equal(parsed.transactionNumber, '00123456');
  assert.equal(parsed.receiptTotalCents, 50000);
  assert.equal(receiptBanknoteTotalCents(parsed.banknoteCounts), 50000);
});

test('does not mistake the next heading for an empty optional purpose', () => {
  const parsed = parseDepositReceiptText(receipt.replace('eingezahlte Noten:', 'Verwendungszweck:\n\neingezahlte Noten:'));
  assert.equal(parsed.purpose, '');
});

test('suggests only a unique exact closing match', () => {
  const closings = [{ id: 'one', expectedDepositCents: 50000 }, { id: 'two', expectedDepositCents: 20000 }];
  assert.deepEqual(matchingClosingSets(closings, 50000), [['one']]);
  assert.deepEqual(matchingClosingSets([...closings, { id: 'three', expectedDepositCents: 30000 }], 50000), [['one'], ['two', 'three']]);
});

test('review requires arithmetic, exact assignment and manual archive confirmation', () => {
  const parsed = parseDepositReceiptText(receipt);
  const closing = { id: 'one', expectedDepositCents: 50000 };
  assert.deepEqual(validateReceiptReview(parsed, [closing], true), []);
  assert.match(validateReceiptReview(parsed, [closing], false).join(' '), /OneDrive/);
  assert.match(validateReceiptReview({ ...parsed, receiptTotalCents: 49900 }, [closing], true).join(' '), /stimmen nicht überein/);
});
