export const DAY_CLOSE_V2_PROCESSES = Object.freeze([
  {
    id: 'daily-report',
    group: 'Am PC',
    title: 'Tageswerte erfassen',
    description: 'Filialbericht prüfen, die vier Tageswerte in der App speichern und die drei vorgesehenen Werte an die Signal-Gruppe senden.',
    dependencies: [],
  },
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
    dependencies: [],
  },
  {
    id: 'safe-movement',
    group: 'Am Tresor',
    title: 'Tresorbewegung durchführen',
    description: 'Den von der App angezeigten Gesamtbetrag zu Bar an Bank legen.',
    dependencies: [],
  },
  {
    id: 'final-safe-count',
    group: 'Am Tresor',
    title: 'Tresor abschließend zählen',
    description: 'Den endgültigen Bestand zählen und mit dem EuroControl-SOLL vergleichen.',
    dependencies: [],
  },
  {
    id: 'finalize',
    group: 'Abschluss',
    title: 'Tagesabrechnung abschließen',
    description: 'Alle Ergebnisse zusammenführen, mit zwei PINs bestätigen und sperren.',
    dependencies: ['daily-report', 'bank-preparation', 'bank-booking', 'safe-target', 'safe-movement', 'final-safe-count'],
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

export function parseMoneyToCents(value) {
  const input = String(value ?? '').trim().replace(/\s/g, '').replace(/€/g, '');
  if (!input) return null;
  const normalized = input.includes(',')
    ? input.replace(/\./g, '').replace(',', '.')
    : input;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function validateDailyReport(values = {}) {
  const dailyRevenueCents = parseMoneyToCents(values.dailyRevenue);
  const averageReceiptCents = parseMoneyToCents(values.averageReceipt);
  const eurocontrolBankCents = parseMoneyToCents(values.eurocontrolBank);
  const customerCount = Number(String(values.customerCount ?? '').trim());
  const errors = {};
  if (!Number.isInteger(dailyRevenueCents) || dailyRevenueCents < 0) errors.dailyRevenue = 'Bitte Tagesumsatz eingeben.';
  if (!Number.isInteger(customerCount) || customerCount < 1) errors.customerCount = 'Bitte Kundenanzahl eingeben.';
  if (!Number.isInteger(averageReceiptCents) || averageReceiptCents < 0) errors.averageReceipt = 'Bitte Durchschnittsbon eingeben.';
  if (!Number.isInteger(eurocontrolBankCents) || eurocontrolBankCents < 0) errors.eurocontrolBank = 'Bitte Bar an Bank eingeben.';
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: { dailyRevenueCents, customerCount, averageReceiptCents, eurocontrolBankCents },
  };
}

export const BANKNOTE_DENOMINATIONS = Object.freeze([5, 10, 20, 50, 100, 200]);

export function normalizeBanknoteCounts(counts = {}) {
  return Object.fromEntries(BANKNOTE_DENOMINATIONS.map((denomination) => {
    const count = Number(counts[denomination] ?? counts[String(denomination)] ?? 0);
    return [denomination, Number.isInteger(count) && count >= 0 ? count : 0];
  }));
}

export function sumBanknoteCounts(counts = {}) {
  const normalized = normalizeBanknoteCounts(counts);
  return BANKNOTE_DENOMINATIONS.reduce((sum, denomination) => sum + (normalized[denomination] * denomination * 100), 0);
}

export function calculateBankBooking({
  banknoteCounts,
  eurocontrolBankCents,
  looseChangeCents,
  latestSafeCountCents,
  safeStandardCents,
} = {}) {
  const counts = normalizeBanknoteCounts(banknoteCounts);
  const banknoteTotalCents = sumBanknoteCounts(counts);
  const roundedEurocontrolBankCents = Number.isInteger(eurocontrolBankCents)
    ? Math.floor(eurocontrolBankCents / 500) * 500
    : null;
  const changeTransferCents = Number.isInteger(looseChangeCents)
    ? Math.floor(Math.max(0, looseChangeCents) / 500) * 500
    : null;
  const expectedBanknoteTotalCents = Number.isInteger(roundedEurocontrolBankCents) && Number.isInteger(changeTransferCents)
    ? roundedEurocontrolBankCents - changeTransferCents
    : null;
  const controlMatches = Number.isInteger(expectedBanknoteTotalCents)
    && expectedBanknoteTotalCents >= 0
    && banknoteTotalCents === expectedBanknoteTotalCents;
  const projectedSafeCents = Number.isInteger(latestSafeCountCents) && Number.isInteger(looseChangeCents) && Number.isInteger(changeTransferCents)
    ? latestSafeCountCents + looseChangeCents - changeTransferCents
    : null;
  const skimCents = Number.isInteger(projectedSafeCents) && Number.isInteger(safeStandardCents)
    ? Math.max(0, Math.floor((projectedSafeCents - safeStandardCents) / 500) * 500)
    : null;
  const safeTransferCents = Number.isInteger(changeTransferCents) && Number.isInteger(skimCents)
    ? changeTransferCents + skimCents
    : null;
  const finalCounts = { ...counts };
  if (Number.isInteger(safeTransferCents)) finalCounts[5] += safeTransferCents / 500;
  const bookingTotalCents = Number.isInteger(roundedEurocontrolBankCents) && Number.isInteger(skimCents)
    ? roundedEurocontrolBankCents + skimCents
    : null;
  const finalDenominationTotalCents = sumBanknoteCounts(finalCounts);

  return {
    counts,
    finalCounts,
    banknoteTotalCents,
    roundedEurocontrolBankCents,
    changeTransferCents,
    expectedBanknoteTotalCents,
    projectedSafeCents,
    skimCents,
    safeTransferCents,
    bookingTotalCents,
    finalDenominationTotalCents,
    valid: controlMatches && Number.isInteger(skimCents) && finalDenominationTotalCents === bookingTotalCents,
  };
}

