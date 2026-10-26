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

export async function prepareReceiptImage(file) {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;
  const bitmap = await createImageBitmap(file);
  try {
    const probeWidth = Math.min(1400, bitmap.width);
    const probeHeight = Math.max(1, Math.round(bitmap.height * (probeWidth / bitmap.width)));
    const probe = document.createElement('canvas');
    probe.width = probeWidth;
    probe.height = probeHeight;
    const probeContext = probe.getContext('2d', { willReadFrequently:true });
    probeContext.drawImage(bitmap, 0, 0, probeWidth, probeHeight);
    const pixels = probeContext.getImageData(0, 0, probeWidth, probeHeight);
    const columnHits = new Uint32Array(probeWidth);
    const rowHits = new Uint32Array(probeHeight);
    for (let y = 0; y < probeHeight; y += 2) {
      for (let x = 0; x < probeWidth; x += 2) {
        const offset = (y * probeWidth + x) * 4;
        const luminance = 0.2126 * pixels.data[offset] + 0.7152 * pixels.data[offset + 1] + 0.0722 * pixels.data[offset + 2];
        if (luminance >= 172) {
          columnHits[x] += 1;
          rowHits[y] += 1;
        }
      }
    }
    const usefulColumns = [...columnHits].map((hits, index) => ({ hits, index }))
      .filter(({ hits }) => hits > probeHeight * 0.12).map(({ index }) => index);
    const usefulRows = [...rowHits].map((hits, index) => ({ hits, index }))
      .filter(({ hits }) => hits > probeWidth * 0.12).map(({ index }) => index);
    const margin = 18;
    const left = usefulColumns.length ? Math.max(0, usefulColumns[0] - margin) : 0;
    const right = usefulColumns.length ? Math.min(probeWidth, usefulColumns.at(-1) + margin) : probeWidth;
    const top = usefulRows.length ? Math.max(0, usefulRows[0] - margin) : 0;
    const bottom = usefulRows.length ? Math.min(probeHeight, usefulRows.at(-1) + margin) : probeHeight;
    const cropWidth = Math.max(1, right - left);
    const cropHeight = Math.max(1, bottom - top);
    const outputWidth = Math.min(1800, Math.max(1100, cropWidth));
    const outputHeight = Math.max(1, Math.round(cropHeight * outputWidth / cropWidth));
    const output = document.createElement('canvas');
    output.width = outputWidth;
    output.height = outputHeight;
    const outputContext = output.getContext('2d', { willReadFrequently:true });
    outputContext.fillStyle = '#fff';
    outputContext.fillRect(0, 0, outputWidth, outputHeight);
    outputContext.drawImage(probe, left, top, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);
    const enhanced = outputContext.getImageData(0, 0, outputWidth, outputHeight);
    for (let offset = 0; offset < enhanced.data.length; offset += 4) {
      const gray = 0.2126 * enhanced.data[offset] + 0.7152 * enhanced.data[offset + 1] + 0.0722 * enhanced.data[offset + 2];
      const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.75 + 150));
      enhanced.data[offset] = contrasted;
      enhanced.data[offset + 1] = contrasted;
      enhanced.data[offset + 2] = contrasted;
    }
    outputContext.putImageData(enhanced, 0, 0);
    return await new Promise((resolve) => output.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.92));
  } finally {
    bitmap.close?.();
  }
}

export function parseDepositReceiptText(text) {
  const source = String(text ?? '').replace(/\r/g, '');
  const flattened = source.replace(/[ \t]+/g, ' ');
  const header = flattened.match(/Datum\s+Uhrzeit\s+T[xX]-?Nr\s+Terminal[\s\S]{0,80}?(\d{1,2}\.\d{1,2}\.\d{2,4})\s+(\d{1,2}:\d{2})\s+(\d{4,})\s+(\d{4,})/i)
    || flattened.match(/(\d{1,2}\.\d{1,2}\.\d{2,4})\s+(\d{1,2}:\d{2})\s+(\d{6,})\s+(\d{6,})/);
  const banknoteCounts = emptyReceiptCounts();
  const noteSection = source.split(/(?:eingezahlte\s+)?Noten\s*:?/i)[1]?.split(/(?:Summe\s*=|Rückfragen)/i)[0] || '';
  const denominations = [5, 10, 20, 50, 100, 200];
  let nextDenominationIndex = 0;
  for (const rawLine of noteSection.split('\n')) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const moneyValues = [...line.matchAll(/([\d.]+)\s*[,\.]\s*(\d{2})\s*(?:EUR|EUF)?/gi)]
      .map((match) => germanMoneyToCents(`${match[1]},${match[2]}`))
      .filter(Number.isInteger);
    const explicit = line.match(/(?:^|\D)(5|10|20|50|100|200)\s*[,\.]?\s*00\s*(?:EUR|EUF)?/i);
    let denomination = explicit ? Number(explicit[1]) : denominations[nextDenominationIndex];
    if (!denominations.includes(denomination) || !moneyValues.length) continue;
    nextDenominationIndex = Math.max(nextDenominationIndex, denominations.indexOf(denomination) + 1);
    const denominationCents = denomination * 100;
    const countMatch = line.match(/[*xX]\s*(\d{1,4})/);
    const printedCount = Number(countMatch?.[1]);
    const printedTotal = moneyValues.at(-1);
    const derivedCount = printedTotal >= denominationCents && printedTotal % denominationCents === 0
      ? printedTotal / denominationCents
      : null;
    const count = Number.isInteger(derivedCount) ? derivedCount : (Number.isInteger(printedCount) ? printedCount : null);
    if (Number.isInteger(count) && count >= 0) banknoteCounts[denominationCents] = count;
  }
  const strictLinePattern = /(5|10|20|50|100|200)[,.]\s*00\s*(?:EUR|EUF)\s*[*xX]\s*(\d+)/gi;
  let strictLine;
  while ((strictLine = strictLinePattern.exec(flattened))) {
    const cents = Number(strictLine[1]) * 100;
    if (!banknoteCounts[cents]) banknoteCounts[cents] = Number(strictLine[2]);
  }
  const totalMatch = flattened.match(/Summe\s*=\s*([\d.]+,\d{2})\s*EUR/i);
  const purposeMatch = source.match(/Verwendungszweck\s*:\s*\n?\s*["“]?(\d{5,12})["”]?/i);
  const purpose = purposeMatch?.[1]?.trim() || '';
  const calculatedTotal = receiptBanknoteTotalCents(banknoteCounts);
  const parsedTotal = germanMoneyToCents(totalMatch?.[1]);
  return {
    depositDate: germanDateToIso(header?.[1]) || '',
    depositTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(header?.[2] || '') ? header[2] : '',
    transactionNumber: String(header?.[3] || '').replace(/\D/g, ''),
    terminalNumber: String(header?.[4] || '').replace(/\D/g, ''),
    purpose: /^eingezahlte\s+Noten\s*:?$/i.test(purpose) ? '' : purpose,
    banknoteCounts,
    receiptTotalCents: Object.values(banknoteCounts).filter((count) => count > 0).length >= 3
      ? calculatedTotal
      : parsedTotal,
  };
}

export function receiptRecognitionScore(receipt = {}) {
  const identityFields = ['depositDate', 'depositTime', 'transactionNumber', 'terminalNumber'];
  const identityScore = identityFields.filter((field) => Boolean(receipt[field])).length * 2;
  const noteScore = Object.values(receipt.banknoteCounts || {}).filter((count) => Number(count) > 0).length;
  return identityScore + noteScore + (Number(receipt.receiptTotalCents) > 0 ? 2 : 0);
}

export function mergeReceiptRecognition(primary = {}, fallback = {}) {
  const banknoteCounts = emptyReceiptCounts();
  for (const cents of RECEIPT_NOTE_CENTS) {
    banknoteCounts[cents] = Number(primary.banknoteCounts?.[cents]) > 0
      ? Number(primary.banknoteCounts[cents])
      : Math.max(0, Number(fallback.banknoteCounts?.[cents]) || 0);
  }
  const calculatedTotal = receiptBanknoteTotalCents(banknoteCounts);
  const recognizedRows = Object.values(banknoteCounts).filter((count) => count > 0).length;
  return {
    depositDate:primary.depositDate || fallback.depositDate || '',
    depositTime:primary.depositTime || fallback.depositTime || '',
    transactionNumber:primary.transactionNumber || fallback.transactionNumber || '',
    terminalNumber:primary.terminalNumber || fallback.terminalNumber || '',
    purpose:primary.purpose || fallback.purpose || '',
    banknoteCounts,
    receiptTotalCents:recognizedRows >= 3
      ? calculatedTotal
      : (primary.receiptTotalCents || fallback.receiptTotalCents || null),
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
