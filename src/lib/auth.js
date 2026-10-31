export function saveAuthSession(token, user) {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify(user));
}

export function saveAuthToken(token, role) {
  saveAuthSession(token, { role });
}

export function getToken() {
  return sessionStorage.getItem('token');
}

export function getRole() {
  return getUser()?.role || null;
}

export function getUser() {
  const user = sessionStorage.getItem('user');
  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

export function logout() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
}
