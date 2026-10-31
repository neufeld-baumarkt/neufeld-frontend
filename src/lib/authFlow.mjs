export function destinationAfterLogin(user) {
  const mode = user?.auth?.forcePasswordChangeMode || 'enforce';
  return user?.forcePasswordChange === true && mode !== 'observe' ? '/passwort-aendern' : '/start';
}

export function userFromLoginResponse(payload) {
  if (!payload?.token || !payload?.role) return null;
  return { id: payload.id, name: payload.name, role: payload.role, filiale: payload.filiale || null,
    active: payload.active !== false, forcePasswordChange: payload.forcePasswordChange === true,
    auth: payload.auth || { tokenMode: 'legacy', forcePasswordChangeMode: 'observe' } };
}

export function userFromSessionResponse(payload) {
  if (!payload?.user) return null;
  return { ...payload.user, auth: payload.auth || payload.user.auth || { tokenMode: 'legacy', forcePasswordChangeMode: 'observe' } };
}

export function validatePasswordChangeForm(newPassword, confirmation) {
  if (newPassword !== confirmation) return 'Die neuen Passwörter stimmen nicht überein.';
  if (typeof newPassword !== 'string' || newPassword.trim().length === 0) return 'Das neue Passwort darf nicht leer sein.';
  if (newPassword.length < 12 || newPassword.length > 128) return 'Das neue Passwort muss 12 bis 128 Zeichen lang sein.';
  if (new TextEncoder().encode(newPassword).length > 72) return 'Das neue Passwort darf höchstens 72 UTF-8-Bytes lang sein.';
  return null;
}
