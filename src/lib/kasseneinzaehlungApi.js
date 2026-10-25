import { activeCashBusinessDate } from './cashBusinessDate.mjs';

const baseUrl = () => import.meta.env.VITE_API_URL;
const token = () => sessionStorage.getItem('token');

async function request(path, options = {}, branch = '') {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`,
      ...(branch ? { 'X-Cash-Branch': branch } : {}),
      ...(activeCashBusinessDate() ? { 'X-Cash-Business-Date': activeCashBusinessDate() } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'Der Kassenvorgang konnte nicht verarbeitet werden.');
    error.code = payload.code;
    error.activeOpening = payload.activeOpening;
    throw error;
  }
  return payload;
}

export const kasseneinzaehlungApi = {
  async branches() {
    const payload = await request('/api/tageskasse/branches');
    return payload.branches || [];
  },
  async verifyPin(pin, { excludeEmployeeId, branch } = {}) {
    const payload = await request('/api/tageskasse/pin/verify', {
      method: 'POST', body: JSON.stringify({ pin, excludeEmployeeId: excludeEmployeeId || null }),
    }, branch);
    return payload.employee;
  },
  async previousClosing(drawerNumber, branch) {
    const payload = await request(`/api/tageskasse/previous-closing?drawer=${encodeURIComponent(drawerNumber)}`, {}, branch);
    return payload.closing;
  },
  async saveOpeningCount({ drawerNumber, carryoverDecision, attempts, replaceActiveOpeningId }, branch) {
    const payload = await request('/api/tageskasse/opening-counts', {
      method: 'POST',
      body: JSON.stringify({
        drawerNumber,
        replaceActiveOpeningId: replaceActiveOpeningId || null,
        carryoverDecision,
        attempts: attempts.map((attempt) => ({ counts: attempt.counts, proofToken: attempt.countedBy.proofToken })),
      }),
    }, branch);
    return payload.openingCount;
  },
};
