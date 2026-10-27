const VERSION = 1;

const allowedStages = new Set([
  'responsible', 'drawer', 'missing-opening', 'full-count', 'loose-change', 'float',
  'bank', 'euro-transfer', 'euro-submit', 'difference', 'review',
]);

export function cashClosingDraftKey(branch, businessDate = 'active') {
  return `neufeld:cash-closing:${String(branch || '').trim().toLowerCase()}:${businessDate || 'active'}`;
}

export function normalizeCashClosingDraft(value) {
  if (!value || value.version !== VERSION || !allowedStages.has(value.stage)) return null;
  if (!value.employee?.id || !value.responsibleEmployee?.id) return null;
  return {
    version: VERSION,
    savedAt: value.savedAt || new Date().toISOString(),
    stage: value.stage,
    employee: { id: value.employee.id, name: value.employee.name },
    responsibleEmployee: { id: value.responsibleEmployee.id, name: value.responsibleEmployee.name },
    isDayFinalClosing: Boolean(value.isDayFinalClosing),
    drawerNumber: Number(value.drawerNumber) || null,
    opening: value.opening || null,
    fullCounts: value.fullCounts || {},
    bankNotes: value.bankNotes || {},
    differenceKind: ['minus', 'zero', 'plus'].includes(value.differenceKind) ? value.differenceKind : 'zero',
    differenceAmount: String(value.differenceAmount || ''),
    differenceReviewed: Boolean(value.differenceReviewed),
    notificationConfirmed: Boolean(value.notificationConfirmed),
    recountAttempts: Array.isArray(value.recountAttempts) ? value.recountAttempts : [],
  };
}

export function readCashClosingDraft(storage, key) {
  try { return normalizeCashClosingDraft(JSON.parse(storage?.getItem(key) || 'null')); }
  catch { return null; }
}

export function writeCashClosingDraft(storage, key, value) {
  const normalized = normalizeCashClosingDraft({ ...value, version: VERSION, savedAt: new Date().toISOString() });
  if (!normalized) return false;
  storage?.setItem(key, JSON.stringify(normalized));
  return true;
}

export function removeCashClosingDraft(storage, key) { storage?.removeItem(key); }

