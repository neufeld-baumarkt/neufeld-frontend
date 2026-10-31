import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useWorkflowDraftAutosave({ enabled, initialDraft, stage, state, saveDraft, delay = 500 }) {
  const [status, setStatus] = useState(initialDraft ? 'saved' : 'idle');
  const [lastSavedAt, setLastSavedAt] = useState(initialDraft?.savedAt || null);
  const revisionRef = useRef(Number(initialDraft?.revision) || 0);
  const saveDraftRef = useRef(saveDraft);
  saveDraftRef.current = saveDraft;
  const timerRef = useRef(null);
  const chainRef = useRef(Promise.resolve());
  const snapshotJson = useMemo(() => JSON.stringify({ stage, state }), [stage, state]);
  const latestRef = useRef(snapshotJson);
  latestRef.current = snapshotJson;

  const persist = useCallback((json = latestRef.current) => {
    if (!enabled || !saveDraftRef.current) return chainRef.current;
    chainRef.current = chainRef.current.catch(() => {}).then(async () => {
      const snapshot = JSON.parse(json);
      setStatus('saving');
      try {
        const saved = await saveDraftRef.current({ ...snapshot, expectedRevision: revisionRef.current });
        revisionRef.current = Number(saved.revision);
        setLastSavedAt(saved.savedAt || new Date().toISOString());
        setStatus('saved');
        return saved;
      } catch (error) {
        setStatus('error');
        throw error;
      }
    });
    return chainRef.current;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !saveDraftRef.current) return undefined;
    setStatus('pending');
    timerRef.current = window.setTimeout(() => { timerRef.current = null; persist(snapshotJson).catch(() => {}); }, delay);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [delay, enabled, persist, snapshotJson]);

  const flush = useCallback(async () => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (!enabled) return { revision: revisionRef.current };
    await persist(latestRef.current);
    return { revision: revisionRef.current };
  }, [enabled, persist]);

  return { flush, lastSavedAt, revisionRef, status };
}
