const baseUrl = () => import.meta.env.VITE_API_URL;
const token = () => sessionStorage.getItem('token');

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl()}/api/tasks${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token()}`, ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `HTTP ${response.status}`);
  return payload;
}

export const pushTasksApi = {
  list: () => request(''),
  users: () => request('/users'),
  notifications: () => request('/notifications'),
  create: (body) => request('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  update: (id, body) => request(`/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  seen: (id) => request(`/${id}/seen`, { method: 'POST' }),
  submit: (id, comment) => request(`/${id}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment }) }),
  review: (taskId, assignmentId, action, reason = '') => request(`/${taskId}/assignments/${assignmentId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, reason }) }),
  deescalate: (id, body) => request(`/${id}/deescalate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  cancel: (id, reason) => request(`/${id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  uploadPhoto: (taskId, assignmentId, file) => request(`/${taskId}/assignments/${assignmentId}/photo`, { method: 'POST', headers: { 'Content-Type': file.type, 'x-file-name': encodeURIComponent(file.name) }, body: file }),
  openEvidence: async (taskId, evidenceId) => {
    const response = await fetch(`${baseUrl()}/api/tasks/${taskId}/evidence/${evidenceId}`, { headers: { Authorization: `Bearer ${token()}` } });
    if (!response.ok) throw new Error('Foto konnte nicht geladen werden.');
    const url = URL.createObjectURL(await response.blob()); window.open(url, '_blank', 'noopener,noreferrer'); setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
