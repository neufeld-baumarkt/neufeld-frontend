const API_ORIGIN = import.meta.env.VITE_API_URL;

async function request(path, options = {}, cashBranch = '') {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token') || ''}`,
      ...(cashBranch ? { 'X-Cash-Branch': cashBranch } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'PIN-Vorgang fehlgeschlagen.');
    error.code = payload.code;
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const employeePinApi = {
  list() {
    return request('/api/filiale-pins');
  },
  create(employee) {
    return request('/api/filiale-pins', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  },
  update(employeeId, employee) {
    return request(`/api/filiale-pins/${encodeURIComponent(employeeId)}`, {
      method: 'PATCH',
      body: JSON.stringify(employee),
    });
  },
  reset(employeeId) {
    return request(`/api/filiale-pins/${encodeURIComponent(employeeId)}/reset-pin`, {
      method: 'POST',
    });
  },
  async verify(pin, { excludeEmployeeId } = {}) {
    const payload = await request('/api/filiale-pins/verify', {
      method: 'POST',
      body: JSON.stringify({ pin, excludeEmployeeId: excludeEmployeeId || null }),
    });
    return payload.employee;
  },
  async firstUseCandidates({ branch } = {}) {
    const payload = await request('/api/filiale-pins/first-use-candidates', {}, branch);
    return payload.employees || [];
  },
  async cashCandidates(branch) {
    const payload = await request(`/api/filiale-pins/cash-candidates?branch=${encodeURIComponent(branch)}`);
    return payload.employees || [];
  },
  async activate({ employeeId, currentPin, newPin, confirmPin }, { branch } = {}) {
    return request('/api/filiale-pins/activate', {
      method: 'POST',
      body: JSON.stringify({
        employee_id: employeeId,
        current_pin: currentPin,
        new_pin: newPin,
        confirm_pin: confirmPin,
      }),
    }, branch);
  },
};
