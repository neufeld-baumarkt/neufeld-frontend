const baseUrl = () => import.meta.env.VITE_API_URL;
const token = () => sessionStorage.getItem('token');

async function request(path, options = {}, branch = '') {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`,
      ...(branch ? { 'X-Cash-Branch': branch } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Die Kassenabrechnung konnte nicht verarbeitet werden.');
  return payload;
}

export const kassenabrechnungApi = {
  async closingContext({ drawerNumber, proofToken }, branch) {
    const payload = await request('/api/tageskasse/closing-context', {
      method: 'POST',
      body: JSON.stringify({ drawerNumber, proofToken }),
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
};
