import test from 'node:test';
import assert from 'node:assert/strict';
import { containsSensitiveDraftKey, resumableDraft, workflowDraftPath, workflowDraftPayload } from './workflowDraft.mjs';

test('erstellt ausschließlich sichere DB-Entwurfspfade und Nutzdaten', () => {
  assert.equal(workflowDraftPath({ workflowType: 'drawer_closing' }), '/workflow-drafts/drawer_closing/active');
  assert.deepEqual(workflowDraftPayload({ branch: 'Vreden', businessDate: '2026-10-31', stage: 'count', state: { counts: { 100: '2' } } }), {
    branch: 'Vreden', businessDate: '2026-10-31', stage: 'count', state: { counts: { 100: '2' } }, expectedRevision: 0,
  });
});

test('lässt PINs und Tokens auch in verschachtelten Zuständen nie passieren', () => {
  assert.equal(containsSensitiveDraftKey({ nested: { firstPin: '1234' } }), true);
  assert.throws(() => workflowDraftPayload({ branch: 'Vreden', businessDate: '2026-10-31', stage: 'count', state: { proofToken: 'secret' } }), /PINs und Tokens/);
  assert.equal(resumableDraft({ revision: 2, state: { approvalProofTokens: [] } }), null);
});
