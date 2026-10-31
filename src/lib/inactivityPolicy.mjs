export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
export const INACTIVITY_WARNING_MS = 60 * 1000;

export function inactivityState({ lastActivityAt, now }) {
  const elapsed = Math.max(0, Number(now) - Number(lastActivityAt));
  const remainingMs = Math.max(0, INACTIVITY_TIMEOUT_MS - elapsed);
  return {
    expired: remainingMs === 0,
    warning: remainingMs > 0 && remainingMs <= INACTIVITY_WARNING_MS,
    remainingSeconds: Math.ceil(remainingMs / 1000),
  };
}
