import test from 'node:test';
import assert from 'node:assert/strict';
import { canCompletePushTaskUi, canManagePushTaskUi, canUsePushTaskPilot, ownAssignment, taskProgress } from './pushTaskUi.mjs';

test('pilot UI is visible only for Admin and Supervisor', () => {
  assert.equal(canUsePushTaskPilot('Admin'), true);
  assert.equal(canUsePushTaskPilot('Supervisor'), true);
  assert.equal(canUsePushTaskPilot('Geschäftsführer'), false);
  assert.equal(canUsePushTaskPilot('Manager-1'), false);
  assert.equal(canUsePushTaskPilot('Filiale'), false);
});

test('assignment and progress remain individual per user', () => {
  const task = { assignments: [{ assignee_user_id: 1, status: 'approved' }, { assignee_user_id: 2, status: 'submitted' }] };
  assert.equal(ownAssignment(task, 2).status, 'submitted');
  assert.deepEqual(taskProgress(task), { approved: 1, total: 2 });
});

test('task list actions follow management and execution permissions', () => {
  const task = { created_by_user_id: 10, status: 'active', assignments: [{ assignee_user_id: 20, status: 'open' }] };
  assert.equal(canManagePushTaskUi(task, { id: 10, role: 'Supervisor' }), true);
  assert.equal(canManagePushTaskUi(task, { id: 30, role: 'Admin' }), true);
  assert.equal(canManagePushTaskUi(task, { id: 30, role: 'Geschäftsführer' }), true);
  assert.equal(canManagePushTaskUi(task, { id: 20, role: 'Filiale' }), false);
  assert.equal(canCompletePushTaskUi(task, { id: 20, role: 'Filiale' }), true);
  assert.equal(canCompletePushTaskUi({ ...task, status: 'cancelled' }, { id: 20, role: 'Filiale' }), false);
});
