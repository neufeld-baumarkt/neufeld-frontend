export function canUsePushTaskPilot(role) {
  return ['admin', 'supervisor'].includes(String(role || '').trim().toLocaleLowerCase('de-DE'));
}

export function assignmentStatusLabel(status) {
  return ({ open: 'Offen', seen: 'Gesehen', submitted: 'Wartet auf Abnahme', approved: 'Bestätigt', rejected: 'Abgelehnt' })[status] || status || '—';
}

export function taskStatusLabel(status) {
  return ({ active: 'Aktiv', completed: 'Erledigt', cancelled: 'Abgebrochen' })[status] || status || '—';
}

export function ownAssignment(task, userId) {
  return (task?.assignments || []).find((assignment) => Number(assignment.assignee_user_id) === Number(userId)) || null;
}

export function canManagePushTaskUi(task, user) {
  return Number(task?.created_by_user_id) === Number(user?.id)
    || ['admin', 'geschäftsführer'].includes(String(user?.role || '').trim().toLocaleLowerCase('de-DE'));
}

export function canCompletePushTaskUi(task, user) {
  const assignment = ownAssignment(task, user?.id);
  return task?.status === 'active' && Boolean(assignment) && !['submitted', 'approved'].includes(assignment.status);
}

export function taskProgress(task) {
  const assignments = Array.isArray(task?.assignments) ? task.assignments : [];
  return { approved: assignments.filter((item) => item.status === 'approved').length, total: assignments.length };
}

export function dateTimeLocalValue(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}
