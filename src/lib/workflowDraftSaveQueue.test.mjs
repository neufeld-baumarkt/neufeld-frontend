import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflowDraftSaveQueue } from './workflowDraftSaveQueue.mjs';

test('serialisiert schnelle Entwurfsspeicherungen mit fortlaufender Revision', async () => {
  const revisions = [];
  let active = 0;
  let maxActive = 0;
  const queue = createWorkflowDraftSaveQueue({
    initialRevision: 4,
    save: async ({ expectedRevision }) => {
      revisions.push(expectedRevision);
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return { revision: expectedRevision + 1, savedAt: '2026-11-01T10:00:00Z' };
    },
  });

  await Promise.all([
    queue.enqueue(JSON.stringify({ stage: 'count', state: { value: 1 } })),
    queue.enqueue(JSON.stringify({ stage: 'count', state: { value: 2 } })),
  ]);

  assert.deepEqual(revisions, [4, 5]);
  assert.equal(maxActive, 1);
  assert.equal(queue.getRevision(), 6);
});

test('blockiert nach einem echten Revisionskonflikt weitere Schreibversuche', async () => {
  let calls = 0;
  const conflict = Object.assign(new Error('Bitte neu laden.'), { status: 409 });
  const queue = createWorkflowDraftSaveQueue({
    save: async () => { calls += 1; throw conflict; },
  });

  await assert.rejects(queue.enqueue(JSON.stringify({ stage: 'count', state: {} })), conflict);
  await assert.rejects(queue.enqueue(JSON.stringify({ stage: 'review', state: {} })), conflict);
  assert.equal(calls, 1);
  assert.equal(queue.getBlockedError(), conflict);
});

test('überspringt einen bereits gespeicherten identischen Stand', async () => {
  const snapshot = JSON.stringify({ stage: 'review', state: { value: 3 } });
  let calls = 0;
  const queue = createWorkflowDraftSaveQueue({
    initialRevision: 7,
    initialSnapshot: snapshot,
    save: async () => { calls += 1; return { revision: 8 }; },
  });

  const result = await queue.enqueue(snapshot);
  assert.deepEqual(result, { revision: 7, skipped: true });
  assert.equal(calls, 0);
});
