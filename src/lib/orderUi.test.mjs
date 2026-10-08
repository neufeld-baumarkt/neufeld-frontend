import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compactSplitPayload,
  dateInBerlin,
  mellerudArticleMatchesSearch,
  mellerudArticleMasterMatchesSearch,
  normalizeSupplierCode,
  orderMeetsMinimumVe,
} from './orderUi.mjs';

test('supplier codes are case independent', () => {
  assert.equal(normalizeSupplierCode(' MELLERUD '), 'mellerud');
});

test('Berlin business date does not use the previous UTC day after local midnight', () => {
  assert.equal(dateInBerlin(new Date('2026-07-01T22:30:00.000Z')), '2026-07-02');
  assert.equal(dateInBerlin(new Date('2026-01-01T23:30:00.000Z')), '2026-01-02');
});

test('minimum VE applies to the whole order', () => {
  assert.equal(orderMeetsMinimumVe(1, 2), false);
  assert.equal(orderMeetsMinimumVe(2, 2), true);
});

test('Mellerud order search uses EAN, Neufeld article number and description only', () => {
  const article = {
    ean: '4004666005047',
    kunden_art_nr: 'NF-4711',
    supplier_article_no: '2001005047',
    name: 'Schimmel Schutz 0,5l',
  };

  assert.equal(mellerudArticleMatchesSearch(article, '4004666005047'), true);
  assert.equal(mellerudArticleMatchesSearch(article, 'nf-4711'), true);
  assert.equal(mellerudArticleMatchesSearch(article, 'SCHIMMEL SCHUTZ'), true);
  assert.equal(mellerudArticleMatchesSearch(article, '2001005047'), false);
});

test('article-master search also finds the supplier article number', () => {
  const article = {
    ean: '4004666005047', kunden_art_nr: 'NF-4711',
    supplier_article_no: '2001005047', name: 'Schimmel Schutz 0,5l',
  };
  assert.equal(mellerudArticleMasterMatchesSearch(article, '2001005047'), true);
  assert.equal(mellerudArticleMasterMatchesSearch(article, 'nicht vorhanden'), false);
  assert.equal(mellerudArticleMasterMatchesSearch(article, ''), true);
});

test('split payload contains only user intent, never client-calculated money', () => {
  assert.deepEqual(compactSplitPayload({
    article: { zeilen: [{ target_filiale: 'Münster', einheit: 'stueck', menge: '3', betrag_netto_berechnet: 999 }] },
  }), {
    article: { zeilen: [{ target_filiale: 'Münster', einheit: 'stueck', menge: 3 }] },
  });
});
