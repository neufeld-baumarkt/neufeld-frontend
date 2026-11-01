import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createWorkflowDraftSaveQueue } from './workflowDraftSaveQueue.mjs';

export function useWorkflowDraftAutosave({ enabled, initialDraft, stage, state, saveDraft, delay = 500 }) {
  const [status, setStatus] = useState(initialDraft ? 'saved' : 'idle');
  const [lastSavedAt, setLastSavedAt] = useState(initialDraft?.savedAt || null);
  const [error, setError] = useState(null);
  const revisionRef = useRef(Number(initialDraft?.revision) || 0);
  const saveDraftRef = useRef(saveDraft);
  saveDraftRef.current = saveDraft;
  const timerRef = useRef(null);
  const snapshotJson = useMemo(() => JSON.stringify({ stage, state }), [stage, state]);
  const latestRef = useRef(snapshotJson);
  latestRef.current = snapshotJson;
  const queueRef = useRef(null);

  if (!queueRef.current) {
    const initialSnapshot = initialDraft
      ? JSON.stringify({ stage: initialDraft.stage, state: initialDraft.state })
      : null;
    queueRef.current = createWorkflowDraftSaveQueue({
      initialRevision: revisionRef.current,
      initialSnapshot,
      save: (payload) => saveDraftRef.current(payload),
      onTransition: (transition) => {
        revisionRef.current = transition.revision;
        setStatus(transition.status);
        setError(transition.error || null);
        if (transition.saved) setLastSavedAt(transition.saved.savedAt || new Date().toISOString());
      },
    });
  }
  queueRef.current.setSave((payload) => saveDraftRef.current(payload));

  const persist = useCallback((json = latestRef.current) => {
    if (!enabled || !saveDraftRef.current) return Promise.resolve({ revision: revisionRef.current });
    const blockedError = queueRef.current.getBlockedError();
    if (blockedError) return Promise.reject(blockedError);
    return queueRef.current.enqueue(json);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !saveDraftRef.current) return undefined;
    if (queueRef.current.getBlockedError()) return undefined;
    setStatus('pending');
    setError(null);
    timerRef.current = window.setTimeout(() => { timerRef.current = null; persist(snapshotJson).catch(() => {}); }, delay);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [delay, enabled, persist, snapshotJson]);

  const flush = useCallback(async () => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (!enabled) return { revision: revisionRef.current };
    await persist(latestRef.current);
    return { revision: revisionRef.current };
  }, [enabled, persist]);

  return { error, flush, lastSavedAt, revisionRef, status };
}
