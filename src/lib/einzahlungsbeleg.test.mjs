import assert from 'node:assert/strict';
import test from 'node:test';
import {
  matchingClosingSets,
  mergeReceiptRecognition,
  parseDepositReceiptText,
  receiptRecognitionScore,
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

test('recovers the real receipt from noisy tablet OCR and trusts the note arithmetic', () => {
  const noisy = `Datum    Uhrzeit Tx-Nr    Terminal
24.10.26 18:58 00534501 00001888
Verwendungszweck:
"241026"
A Noten:
5, 00 EUR * 11 = 55,00 EUR
10,( EUR * 25 = 250,00 EUR
20,00 EUR * 28 = 560,00 EUR
= = =)50,00 EUR * 37= 1.850,00 EUR
100,00 EUR * 1= 100,00 EUR
Summe = 2.615,00 EUR`;
  const parsed = parseDepositReceiptText(noisy);
  assert.equal(parsed.depositDate, '2026-10-24');
  assert.equal(parsed.transactionNumber, '00534501');
  assert.equal(parsed.purpose, '241026');
  assert.deepEqual(parsed.banknoteCounts, { 500:11, 1000:25, 2000:28, 5000:37, 10000:1, 20000:0 });
  assert.equal(parsed.receiptTotalCents, 281500);
  assert.ok(receiptRecognitionScore(parsed) >= 8);
});

test('merges a weak second OCR pass without erasing already recognized values', () => {
  const merged = mergeReceiptRecognition(
    { depositDate:'', banknoteCounts:{ 500:0, 1000:2 }, receiptTotalCents:null },
    { depositDate:'2026-10-24', depositTime:'19:00', transactionNumber:'00534601', terminalNumber:'00001888', banknoteCounts:{ 500:4, 1000:0 }, receiptTotalCents:4000 },
  );
  assert.equal(merged.depositDate, '2026-10-24');
  assert.equal(merged.banknoteCounts[500], 4);
  assert.equal(merged.banknoteCounts[1000], 2);
  assert.equal(merged.receiptTotalCents, 4000);
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
