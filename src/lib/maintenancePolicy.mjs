export const defaultMaintenanceStatus = Object.freeze({
  mode: 'unavailable', message: null, revision: 0,
  activeCashProcesses: 0, lastCashActivityAt: null, updatedAt: null,
});

export function normalizeMaintenanceStatus(value) {
  const mode = ['open', 'draining', 'maintenance'].includes(value?.mode) ? value.mode : 'unavailable';
  return {
    mode,
    message: typeof value?.message === 'string' ? value.message : null,
    revision: Number.isInteger(Number(value?.revision)) ? Number(value.revision) : 0,
    activeCashProcesses: Math.max(0, Number(value?.activeCashProcesses) || 0),
    lastCashActivityAt: value?.lastCashActivityAt || null,
    updatedAt: value?.updatedAt || null,
  };
}

export function mayStartCashWorkflow(status, existingDraft) {
  return status?.mode === 'open' || (status?.mode === 'draining' && Boolean(existingDraft));
}
