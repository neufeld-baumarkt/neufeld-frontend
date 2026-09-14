export function getTrackingConflictAlert(error, trackingId) {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;

  if (status !== 409 || code !== 'TRACKING_ID_EXISTS') return null;

  const normalizedTrackingId = String(trackingId ?? '').trim();
  const trackingReference = normalizedTrackingId
    ? `Die Tracking-ID "${normalizedTrackingId}" wurde bereits für eine andere Reklamation verwendet.`
    : 'Diese Tracking-ID wurde bereits für eine andere Reklamation verwendet.';

  return [
    'BUCHUNG NICHT MÖGLICH',
    '',
    trackingReference,
    '',
    'Jede GLS-Tracking-ID darf nur einmal verwendet werden.',
    'Bitte bestätige diese Meldung mit OK und gib anschließend die korrekte, eindeutige Tracking-ID ein.',
  ].join('\n');
}
