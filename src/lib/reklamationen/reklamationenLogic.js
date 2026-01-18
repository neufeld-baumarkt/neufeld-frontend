// src/lib/reklamationen/reklamationenLogic.js

/**
 * Filter + Sortierung (pure function)
 * Verhalten 1:1 wie vorher:
 * - filiale/status/reklaNr
 * - sort: primär datum (asc/desc), sekundär min_lfd_nr (ASC)
 */
export function filterAndSortReklas(data, filters) {
  const safeData = Array.isArray(data) ? data : [];
  const f = filters || {};

  let result = [...safeData];

  if (f.filiale && f.filiale !== "Alle") {
    result = result.filter((r) => r?.filiale === f.filiale);
  }

  if (f.status && f.status !== "Alle") {
    result = result.filter((r) => r?.status === f.status);
  }

  if (f.reklaNr) {
    const search = String(f.reklaNr).toLowerCase();
    result = result.filter((r) =>
      String(r?.rekla_nr || "").toLowerCase().includes(search)
    );
  }

  result.sort((a, b) => {
    const ta = a?.datum ? new Date(a.datum).getTime() : 0;
    const tb = b?.datum ? new Date(b.datum).getTime() : 0;

    const da = Number.isFinite(ta) ? ta : 0;
    const db = Number.isFinite(tb) ? tb : 0;

    if (da !== db) {
      return f.sortDatum === "asc" ? da - db : db - da;
    }

    const la = a?.min_lfd_nr ?? Number.MAX_SAFE_INTEGER;
    const lb = b?.min_lfd_nr ?? Number.MAX_SAFE_INTEGER;

    return la - lb;
  });

  return result;
}

/**
 * Pagination (pure function)
 * liefert: pagedData + totalPages
 */
export function paginateReklas(items, currentPage, pageSize) {
  const list = Array.isArray(items) ? items : [];
  const size = Number(pageSize) > 0 ? Number(pageSize) : 10;

  const totalPages = Math.ceil(list.length / size);

  const pageNum = Number(currentPage) > 0 ? Number(currentPage) : 1;
  const start = (pageNum - 1) * size;
  const end = pageNum * size;

  const pagedData = list.slice(start, end);

  return { pagedData, totalPages };
}

/**
 * Seitenanzeige (pure function) – exakt wie vorher:
 * Blockweise 5 Seiten.
 */
export function getVisiblePages(currentPage, totalPages) {
  const tp = Number(totalPages) > 0 ? Number(totalPages) : 0;
  if (tp <= 0) return [];

  const cp = Number(currentPage) > 0 ? Number(currentPage) : 1;

  const start = Math.floor((cp - 1) / 5) * 5 + 1;
  const len = Math.min(5, tp - start + 1);

  if (len <= 0) return [];

  return Array.from({ length: len }, (_, i) => start + i);
}
