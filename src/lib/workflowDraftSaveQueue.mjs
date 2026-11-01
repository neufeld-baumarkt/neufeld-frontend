export function isWorkflowDraftConflict(error) {
  return Number(error?.status) === 409;
}

export function createWorkflowDraftSaveQueue({ initialRevision = 0, initialSnapshot = null, save, onTransition = () => {} }) {
  let revision = Number(initialRevision) || 0;
  let savedSnapshot = initialSnapshot;
  let blockedError = null;
  let saveDraft = save;
  let chain = Promise.resolve();

  const enqueue = (snapshotJson) => {
    if (blockedError) return Promise.reject(blockedError);

    chain = chain.catch(() => {}).then(async () => {
      if (blockedError) throw blockedError;
      if (snapshotJson === savedSnapshot) return { revision, skipped: true };

      onTransition({ status: 'saving', error: null, revision });
      try {
        const snapshot = JSON.parse(snapshotJson);
        const saved = await saveDraft({ ...snapshot, expectedRevision: revision });
        revision = Number(saved.revision);
        savedSnapshot = snapshotJson;
        onTransition({ status: 'saved', error: null, revision, saved });
        return saved;
      } catch (error) {
        const conflict = isWorkflowDraftConflict(error);
        if (conflict) blockedError = error;
        onTransition({ status: conflict ? 'conflict' : 'error', error, revision });
        throw error;
      }
    });

    return chain;
  };

  return {
    enqueue,
    getBlockedError: () => blockedError,
    getRevision: () => revision,
    setSave: (nextSave) => { saveDraft = nextSave; },
  };
}
