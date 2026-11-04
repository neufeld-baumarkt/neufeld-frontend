import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DAY_CLOSE_DEMO_CONTEXT, finalizeDayCloseDemo } from './tagesabschlussDemo.mjs';

test('Demo verwendet realistische, unveränderliche Schulungsdaten', () => {
  assert.equal(Object.isFrozen(DAY_CLOSE_DEMO_CONTEXT), true);
  assert.equal(DAY_CLOSE_DEMO_CONTEXT.bankPayoutCents, 125781);
});

test('Demo-Abschluss erzeugt nur ein nicht persistiertes In-Memory-Ergebnis', () => {
  const result = finalizeDayCloseDemo({
    reportData:{dailyRevenueCents:487540,customerCount:123,averageReceiptCents:3964,eurocontrolBankCents:125781},
    calculation:{bookingTotalCents:125500}, safeCount:{countedTotalCents:250362},
  });
  assert.equal(result.report.persisted, false);
  assert.equal(result.report.workflowVersion, 'v2-demo');
  assert.equal(JSON.stringify(result).includes('proofToken'), false);
});

test('Schulung und Echtbetrieb verwenden dasselbe Modal mit gesperrten Schreibpfaden', async () => {
  const page = await readFile(new URL('../pages/Tageskassenabrechnung.jsx', import.meta.url), 'utf8');
  const modal = await readFile(new URL('../components/tageskasse/TagesabschlussV2Modal.jsx', import.meta.url), 'utf8');
  assert.match(page, /dayCloseDemoOpen&&<TagesabschlussV2Modal/);
  assert.match(page, /<TagesabschlussV2Modal\s+demoMode/);
  assert.match(modal, /demoMode={demoMode}/);
  assert.match(modal, /enabled: !demoMode/);
  assert.match(modal, /if \(!demoMode\) \{[\s\S]*await saveDailyMetrics/);
  assert.match(modal, /if \(demoMode\) \{[\s\S]*finalizeDayCloseDemo/);
});
