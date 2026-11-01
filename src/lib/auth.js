export function saveAuthToken(token, role) {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify({ role }));
}

export function getToken() {
  return sessionStorage.getItem('token');
}

export function getRole() {
  const user = sessionStorage.getItem('user');
  if (!user) return null;

  try {
    const parsed = JSON.parse(user);
    return parsed.role;
  } catch {
    return null;
  }
}

export function logout() {
  sessionStorage.clear();
}
