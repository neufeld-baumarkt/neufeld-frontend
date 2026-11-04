export const DAY_CLOSE_DEMO_CONTEXT = Object.freeze({
  bankPayoutCents: 125781,
  bankPayoutStatus: 'provisional',
  looseChangeCents: 781,
  closingCount: 2,
  latestSafeCount: { countedTotalCents: 250081, countType: 'handover', completedAt: '2026-10-28T12:00:00+01:00' },
  safeStandardCents: 250000,
  fixedDrawerCents: 50000,
  littleBerthaCents: 100000,
  individualCashBanknotes: { 5: 0, 10: 0, 20: 0, 50: 25, 100: 0, 200: 0 },
  eurocontrolSafeTargetCents: null,
  processStates: {},
});

export const DAY_CLOSE_DEMO_REPORT = Object.freeze({
  dailyRevenue: '4875,40',
  customerCount: '123',
  averageReceipt: '39,64',
});

export const DAY_CLOSE_DEMO_BANKNOTES = Object.freeze({ 5: 0, 10: 0, 20: 0, 50: 25, 100: 0, 200: 0 });
export const DAY_CLOSE_DEMO_SAFE_TARGET = '2503,62';
export const DAY_CLOSE_DEMO_SAFE_COUNT = Object.freeze({ looseMoney: '3,62', rollCounts: {}, noteCounts: { 5000: 20 } });

export function finalizeDayCloseDemo({ reportData, calculation, safeCount } = {}) {
  if (!reportData || !calculation || !safeCount) {
    throw new Error('Die Demo kann erst nach allen Pflichtschritten abgeschlossen werden.');
  }
  return {
    report: {
      workflowVersion:'v2-demo', dailyMetrics:{...reportData}, babReconciliation:null,
      babReport:{ eurocontrolTargetCents:reportData.eurocontrolBankCents, roundedCents:calculation.roundedEurocontrolBankCents, safeSkimCents:calculation.skimCents, bookedCents:calculation.bookingTotalCents },
      bankPayoutCents:calculation.bookingTotalCents, finalSafeCount:{...safeCount}, persisted:false,
    },
    approvals:[{id:'demo-1',name:'Demo-Person 1'},{id:'demo-2',name:'Demo-Person 2'}],
  };
}
