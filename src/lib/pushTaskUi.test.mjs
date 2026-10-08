import test from 'node:test';
import assert from 'node:assert/strict';
import { canUsePushTaskPilot, ownAssignment, taskProgress } from './pushTaskUi.mjs';

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
