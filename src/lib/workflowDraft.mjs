const WORKFLOW_TYPES = new Set(['drawer_opening', 'drawer_closing', 'safe_count', 'day_close']);
const FORBIDDEN_KEY = /(pin|password|passwort|secret|token|proof|credential|authorization)/i;

export function containsSensitiveDraftKey(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, nested]) => FORBIDDEN_KEY.test(key) || containsSensitiveDraftKey(nested));
}

export function workflowDraftPath({ workflowType, draftKey = 'active' }) {
  if (!WORKFLOW_TYPES.has(workflowType)) throw new Error('Entwurfstyp ist ungültig.');
  if (!/^[A-Za-z0-9:_-]{1,80}$/.test(draftKey)) throw new Error('Entwurfsschlüssel ist ungültig.');
  return `/workflow-drafts/${encodeURIComponent(workflowType)}/${encodeURIComponent(draftKey)}`;
}

export function workflowDraftPayload({ branch, businessDate, stage, state, expectedRevision = 0 }) {
  if (!branch || !/^\d{4}-\d{2}-\d{2}$/.test(businessDate || '')) throw new Error('Filiale und Geschäftstag fehlen.');
  if (!/^[A-Za-z0-9:_-]{1,80}$/.test(stage || '')) throw new Error('Entwurfsstufe ist ungültig.');
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('Entwurfszustand ist ungültig.');
  if (containsSensitiveDraftKey(state)) throw new Error('PINs und Tokens dürfen nicht als Entwurf gespeichert werden.');
  return { branch, businessDate, stage, state, expectedRevision };
}

export function resumableDraft(value) {
  if (!value || !Number.isInteger(Number(value.revision)) || Number(value.revision) < 1) return null;
  if (!value.state || typeof value.state !== 'object' || Array.isArray(value.state)) return null;
  if (containsSensitiveDraftKey(value.state)) return null;
  return { ...value, revision: Number(value.revision) };
}
