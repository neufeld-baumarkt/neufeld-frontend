const API_ORIGIN = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token') || ''}`, ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Tresorzählung fehlgeschlagen.');
  return payload;
}

export const safeCountApi = {
  async context(branch, businessDate) {
    const query = new URLSearchParams({ branch, businessDate });
    return request(`/api/tageskasse/safe-counts/context?${query.toString()}`);
  },
  async complete(payload) {
    return request('/api/tageskasse/safe-counts', { method: 'POST', body: JSON.stringify(payload) });
  },
};
