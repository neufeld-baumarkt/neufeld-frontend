function basics() {
  const token = sessionStorage.getItem('token');
  const baseUrl = import.meta.env.VITE_API_URL;
  if (!token || !baseUrl) throw new Error('Sitzung oder API-Konfiguration fehlt.');
  return { token, baseUrl };
}

async function request(path, options = {}) {
  const { token, baseUrl } = basics();
  const response = await fetch(`${baseUrl}/api/tageskasse${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Tageskasse konnte nicht verarbeitet werden.');
  return data;
}

export const tageskasseApi = {
  load: (businessDate, branch) => request(`?datum=${encodeURIComponent(businessDate)}&filiale=${encodeURIComponent(branch)}`),
  save: (payload) => request('', { method: 'PUT', body: JSON.stringify(payload) }),
  submit: (payload) => request('/submit', { method: 'POST', body: JSON.stringify(payload) }),
  previousClosing: ({ businessDate, branch, drawerNumber }) => request(`/openings/previous?businessDate=${encodeURIComponent(businessDate)}&branch=${encodeURIComponent(branch)}&drawerNumber=${encodeURIComponent(drawerNumber)}`),
  saveOpening: (payload) => request('/openings', { method: 'POST', body: JSON.stringify(payload) }),
  closingContext: ({ businessDate, branch, drawerNumber }) => request(`/drawer-closings/context?businessDate=${encodeURIComponent(businessDate)}&branch=${encodeURIComponent(branch)}&drawerNumber=${encodeURIComponent(drawerNumber)}`),
  saveClosing: (payload) => request('/drawer-closings', { method: 'POST', body: JSON.stringify(payload) }),
  dayCloseContext: ({ businessDate, branch }) => request(`/day-close/context?businessDate=${encodeURIComponent(businessDate)}&branch=${encodeURIComponent(branch)}`),
  saveDailyMetrics: (payload) => request('/day-close/metrics', { method: 'PUT', body: JSON.stringify(payload) }),
  saveFinalSafeCount: (payload) => request('/day-close/final-safe-count', { method: 'POST', body: JSON.stringify(payload) }),
  finalizeDay: (payload) => request('/day-close/finalize', { method: 'POST', body: JSON.stringify(payload) }),
  openDepositReceipts: (branch) => request(`/deposit-receipts/open?filiale=${encodeURIComponent(branch)}`),
  confirmDepositReceipt: (payload) => request('/deposit-receipts/confirm', { method: 'POST', body: JSON.stringify(payload) }),
};
