export function normalizeSupplierCode(value) {
  return String(value || '').trim().toLowerCase();
}

export function canManageMellerudArticleMaster(role) {
  return ['admin', 'supervisor', 'geschäftsführer']
    .includes(String(role || '').trim().toLocaleLowerCase('de-DE'));
}

export function normalizeOrderSearchValue(value) {
  return String(value || '').toLocaleLowerCase('de-DE').trim();
}

export function mellerudArticleMatchesSearch(article, searchTerm) {
  const term = normalizeOrderSearchValue(searchTerm);
  if (!term) return false;

  return [article?.ean, article?.kunden_art_nr, article?.name]
    .map(normalizeOrderSearchValue)
    .some((value) => value.includes(term));
}

export function mellerudArticleMasterMatchesSearch(article, searchTerm) {
  const term = normalizeOrderSearchValue(searchTerm);
  if (!term) return true;

  return [article?.ean, article?.kunden_art_nr, article?.supplier_article_no, article?.name]
    .map(normalizeOrderSearchValue)
    .some((value) => value.includes(term));
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
