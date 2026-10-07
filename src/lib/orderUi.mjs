export function normalizeSupplierCode(value) {
  return String(value || '').trim().toLowerCase();
}

export function dateInBerlin(date = new Date()) {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function orderMeetsMinimumVe(totalVe, minimumVe = 2) {
  const total = Number(totalVe);
  const minimum = Number(minimumVe);
  return Number.isInteger(total) && Number.isInteger(minimum) && minimum > 0 && total >= minimum;
}

export function compactSplitPayload(splitDataByArticle) {
  return Object.fromEntries(
    Object.entries(splitDataByArticle || {})
      .map(([articleId, block]) => [articleId, {
        zeilen: Array.isArray(block?.zeilen)
          ? block.zeilen.map((row) => ({
              target_filiale: row.target_filiale,
              einheit: row.einheit,
              menge: Number(row.menge),
            }))
          : [],
      }])
      .filter(([, block]) => block.zeilen.length > 0)
  );
}
