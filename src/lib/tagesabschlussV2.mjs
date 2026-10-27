export const DAY_CLOSE_V2_PROCESSES = Object.freeze([
  {
    id: 'bank-preparation',
    group: 'Vorbereitung',
    title: 'Bar an Bank vorbereiten',
    description: 'Gesamtsumme und Buchungsstückelung für EuroControl bereitstellen.',
    dependencies: [],
  },
  {
    id: 'bank-booking',
    group: 'Am PC',
    title: 'Bar an Bank buchen',
    description: 'Stückelungen in EuroControl eingeben und die Buchung abschließen.',
    dependencies: ['bank-preparation'],
  },
  {
    id: 'safe-target',
    group: 'Am PC',
    title: 'Tresor-SOLL übernehmen',
    description: 'Den neuen Tresorbestand aus dem EuroControl-Tresorbericht übertragen.',
    dependencies: ['bank-booking'],
  },
  {
    id: 'safe-movement',
    group: 'Am Tresor',
    title: 'Tresorbewegung durchführen',
    description: 'Den von der App angezeigten Gesamtbetrag zu Bar an Bank legen.',
    dependencies: ['safe-target'],
  },
  {
    id: 'final-safe-count',
    group: 'Am Tresor',
    title: 'Tresor abschließend zählen',
    description: 'Den endgültigen Bestand zählen und mit dem EuroControl-SOLL vergleichen.',
    dependencies: ['safe-movement'],
  },
  {
    id: 'finalize',
    group: 'Abschluss',
    title: 'Tagesabrechnung abschließen',
    description: 'Alle Ergebnisse zusammenführen, mit zwei PINs bestätigen und sperren.',
    dependencies: ['final-safe-count'],
  },
]);

const isCompleted = (state) => state?.status === 'completed';

export function buildDayCloseV2ViewModel(context = {}) {
  const processStates = context.processStates || {};
  const processes = DAY_CLOSE_V2_PROCESSES
    .filter((process) => processStates[process.id]?.required !== false)
    .map((process) => {
      const persisted = processStates[process.id] || {};
      const dependenciesMet = process.dependencies.every((id) => (
        processStates[id]?.required === false || isCompleted(processStates[id])
      ));
      const status = persisted.status === 'completed'
        ? 'completed'
        : persisted.status === 'in_progress'
          ? 'in_progress'
          : dependenciesMet
            ? 'open'
            : 'locked';
      return { ...process, ...persisted, status };
    });

  const completed = processes.filter((process) => process.status === 'completed').length;
  const required = processes.length;
  const percent = required ? Math.round((completed / required) * 100) : 0;
  const latestSafeCount = context.latestSafeCount || null;
  const bankPayoutCents = Number.isInteger(context.bankPayoutCents)
    ? context.bankPayoutCents
    : Number.isInteger(context.cashRevenueCents)
      ? context.cashRevenueCents
      : null;

  return {
    processes,
    progress: { completed, required, percent },
    summary: {
      bankPayoutCents,
      bankPayoutStatus: context.bankPayoutStatus || 'provisional',
      looseChangeCents: Number(context.looseChangeCents || 0),
      closingCount: Number(context.closingCount || 0),
      latestSafeCount,
      eurocontrolSafeTargetCents: Number.isInteger(context.eurocontrolSafeTargetCents)
        ? context.eurocontrolSafeTargetCents
        : null,
    },
  };
}

