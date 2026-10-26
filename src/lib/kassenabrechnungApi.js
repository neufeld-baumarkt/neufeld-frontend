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
  if (!response.ok) throw new Error(payload.message || 'Die Kassenabrechnung konnte nicht verarbeitet werden.');
  return payload;
}

export const kassenabrechnungApi = {
  async employees(branch) {
    const payload = await request('/api/tageskasse/employees', {}, branch);
    return payload.employees || [];
  },
  async closingContext({ drawerNumber, proofToken, responsibleEmployeeId }, branch) {
    const payload = await request('/api/tageskasse/closing-context', {
      method: 'POST',
      body: JSON.stringify({ drawerNumber, proofToken, responsibleEmployeeId }),
    }, branch);
    return payload;
  },
  async saveClosing(payload, branch) {
    const response = await request('/api/tageskasse/closings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, branch);
    return response.closing;
  },
  async listClosings(branch, businessDate = '') {
    const suffix = businessDate ? `?businessDate=${encodeURIComponent(businessDate)}` : '';
    return request(`/api/tageskasse/closings${suffix}`, {}, branch);
  },
  async dayOverview(branch) {
    return request('/api/tageskasse/day-overview', {}, branch);
  },
  async closing(closingId, branch) {
    return request(`/api/tageskasse/closings/${encodeURIComponent(closingId)}`, {}, branch);
  },
  async correctClosing(closingId, payload, branch) {
    const response = await request(`/api/tageskasse/closings/${encodeURIComponent(closingId)}/corrections`, {
      method:'POST', body:JSON.stringify(payload),
    }, branch);
    return response.correction;
  },
  async safeContext(countType, branch) {
    return request(`/api/tageskasse/safe-counts/context?type=${encodeURIComponent(countType)}`, {}, branch);
  },
  async saveSafeCount(payload, branch) {
    const response = await request('/api/tageskasse/safe-counts', {
      method:'POST', body:JSON.stringify(payload),
    }, branch);
    return response.safeCount;
  },
  async dayCloseContext(branch) {
    const response = await request('/api/tageskasse/day-close/context', {}, branch);
    return response.context;
  },
  async finalizeDay(payload, branch) {
    const response = await request('/api/tageskasse/day-close/finalize', {
      method:'POST', body:JSON.stringify(payload),
    }, branch);
    return response.report;
  },
  async finalizedDays(branch) {
    const response = await request('/api/tageskasse/business-days', {}, branch);
    return response.days || [];
  },
  async finalizedDay(businessDate, branch) {
    const response = await request(`/api/tageskasse/business-days/${encodeURIComponent(businessDate)}`, {}, branch);
    return response.report;
  },
  async listSafeCounts(branch) {
    const response = await request('/api/tageskasse/safe-counts', {}, branch);
    return response.counts || [];
  },
  async openDepositReceipts(branch) {
    return request('/api/tageskasse/deposit-receipts/open', {}, branch);
  },
  async confirmDepositReceipt(payload, branch) {
    return request('/api/tageskasse/deposit-receipts/confirm', {
      method:'POST', body:JSON.stringify(payload),
    }, branch);
  },
};
