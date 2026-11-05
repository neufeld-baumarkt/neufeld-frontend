import test from 'node:test';
import assert from 'node:assert/strict';
import { cashClosingDraftKey, normalizeCashClosingDraft, readCashClosingDraft, removeCashClosingDraft, writeCashClosingDraft } from './kassenabrechnungDraft.mjs';

function memoryStorage() {
  const values = new Map();
  return { getItem:(key)=>values.get(key)??null, setItem:(key,value)=>values.set(key,value), removeItem:(key)=>values.delete(key) };
}

const draft = { stage:'euro-transfer', employee:{id:1,name:'Max Mustermann'}, responsibleEmployee:{id:1,name:'Max Mustermann'}, drawerNumber:1, fullCounts:{1:'22'}, bankNotes:{5000:'10'} };

test('sichert eine laufende Abrechnung ohne PIN und Proof-Token', () => {
  const storage=memoryStorage(); const key=cashClosingDraftKey('Vreden');
  assert.equal(writeCashClosingDraft(storage,key,{...draft,stage:'eurocontrol-bank',previousBabTotalCents:163601,cumulativeBabMatches:false,cumulativeBabEurocontrol:'2.740,00',pin:'1234',proofToken:'secret'}),true);
  const restored=readCashClosingDraft(storage,key);
  assert.equal(restored.stage,'eurocontrol-bank'); assert.equal(restored.previousBabTotalCents,163601); assert.equal(restored.cumulativeBabMatches,false); assert.equal(restored.cumulativeBabEurocontrol,'2.740,00'); assert.equal(restored.pin,undefined); assert.equal(restored.proofToken,undefined);
  removeCashClosingDraft(storage,key); assert.equal(readCashClosingDraft(storage,key),null);
});

test('verwirft unvollständige und abgeschlossene Entwürfe', () => {
  assert.equal(normalizeCashClosingDraft({...draft,stage:'complete',version:1}),null);
  assert.equal(normalizeCashClosingDraft({...draft,employee:null,version:1}),null);
});

