export const RECEIPT_NOTE_CENTS = Object.freeze([500, 1000, 2000, 5000, 10000, 20000]);

export function formatEuroCents(cents) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((Number(cents) || 0) / 100);
}

export function germanMoneyToCents(value) {
  const normalized = String(value ?? '').trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

export function germanDateToIso(value) {
  const match = String(value ?? '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if (!match) return null;
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  const month = Number(match[2]);
  const day = Number(match[1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function emptyReceiptCounts() {
  return Object.fromEntries(RECEIPT_NOTE_CENTS.map((cents) => [cents, 0]));
}

export function receiptBanknoteTotalCents(counts = {}) {
  return RECEIPT_NOTE_CENTS.reduce((sum, cents) => {
    const count = Number(counts[cents] ?? 0);
    return sum + cents * (Number.isInteger(count) && count >= 0 ? count : 0);
  }, 0);
}

export function parseDepositReceiptText(text) {
  const source = String(text ?? '').replace(/\r/g, '');
  const flattened = source.replace(/[ \t]+/g, ' ');
  const header = flattened.match(/Datum\s+Uhrzeit\s+Tx-?Nr\s+Terminal\s*\n?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})\s+(\d{1,2}:\d{2})\s+(\d{4,})\s+(\d{4,})/i);
  const banknoteCounts = emptyReceiptCounts();
  const linePattern = /(5|10|20|50|100|200)[,.]00\s*EUR\s*[*xX]\s*(\d+)\s*=\s*([\d.]+,\d{2})\s*EUR/gi;
  let line;
  while ((line = linePattern.exec(flattened))) banknoteCounts[Number(line[1]) * 100] = Number(line[2]);
  const totalMatch = flattened.match(/Summe\s*=\s*([\d.]+,\d{2})\s*EUR/i);
  const purposeMatch = source.match(/Verwendungszweck\s*:\s*\n?\s*["“]?([^\n"”]+)["”]?/i);
  const purpose = purposeMatch?.[1]?.trim() || '';
  return {
    depositDate: germanDateToIso(header?.[1]) || '',
    depositTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(header?.[2] || '') ? header[2] : '',
    transactionNumber: String(header?.[3] || '').replace(/\D/g, ''),
    terminalNumber: String(header?.[4] || '').replace(/\D/g, ''),
    purpose: /^eingezahlte\s+Noten\s*:?$/i.test(purpose) ? '' : purpose,
    banknoteCounts,
    receiptTotalCents: germanMoneyToCents(totalMatch?.[1]),
  };
}

export function matchingClosingSets(closings = [], receiptTotalCents) {
  const matches = [];
  const candidates = closings.filter((closing) => Number(closing.expectedDepositCents) > 0);
  const visit = (index, ids, total) => {
    if (total === receiptTotalCents && ids.length) matches.push(ids);
    if (total >= receiptTotalCents) return;
    for (let cursor = index; cursor < candidates.length; cursor += 1) {
      visit(cursor + 1, [...ids, candidates[cursor].id], total + Number(candidates[cursor].expectedDepositCents));
    }
  };
  visit(0, [], 0);
  return matches;
}

export function validateReceiptReview(receipt, selectedClosings = [], onedriveConfirmed = false) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receipt.depositDate || '')) errors.push('Einzahlungsdatum prüfen.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(receipt.depositTime || '')) errors.push('Uhrzeit prüfen.');
  if (!/^\d{4,40}$/.test(receipt.transactionNumber || '')) errors.push('Transaktionsnummer prüfen.');
  if (!/^\d{4,40}$/.test(receipt.terminalNumber || '')) errors.push('Terminalnummer prüfen.');
  if (!Number.isInteger(receipt.receiptTotalCents) || receipt.receiptTotalCents <= 0) errors.push('Belegsumme prüfen.');
  if (receiptBanknoteTotalCents(receipt.banknoteCounts) !== receipt.receiptTotalCents) errors.push('Scheine und Belegsumme stimmen nicht überein.');
  const selectedTotal = selectedClosings.reduce((sum, closing) => sum + Number(closing.expectedDepositCents || 0), 0);
  if (!selectedClosings.length) errors.push('Tagesabschluss auswählen.');
  else if (selectedTotal !== receipt.receiptTotalCents) errors.push('Beleg und Tagesabschluss stimmen nicht überein.');
  if (!onedriveConfirmed) errors.push('OneDrive-Ablage bestätigen.');
  return errors;
}
