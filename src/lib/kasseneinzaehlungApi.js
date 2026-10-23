const baseUrl = () => import.meta.env.VITE_API_URL;
const token = () => sessionStorage.getItem('token');

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Der Kassenvorgang konnte nicht verarbeitet werden.');
  return payload;
}

export const kasseneinzaehlungApi = {
  async verifyPin(pin, { excludeEmployeeId } = {}) {
    const payload = await request('/api/tageskasse/pin/verify', {
      method: 'POST', body: JSON.stringify({ pin, excludeEmployeeId: excludeEmployeeId || null }),
    });
    return payload.employee;
  },
  async previousClosing(drawerNumber) {
    const payload = await request(`/api/tageskasse/previous-closing?drawer=${encodeURIComponent(drawerNumber)}`);
    return payload.closing;
  },
  async saveOpeningCount({ drawerNumber, carryoverDecision, attempts }) {
    const payload = await request('/api/tageskasse/opening-counts', {
      method: 'POST',
      body: JSON.stringify({
        drawerNumber,
        carryoverDecision,
        attempts: attempts.map((attempt) => ({ counts: attempt.counts, proofToken: attempt.countedBy.proofToken })),
      }),
    });
    return payload.openingCount;
  },
};
