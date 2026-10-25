export const COIN_ROLLS = Object.freeze([
  { cents: 1, label: '1 ct', rollValueCents: 50 },
  { cents: 2, label: '2 ct', rollValueCents: 100 },
  { cents: 5, label: '5 ct', rollValueCents: 250 },
  { cents: 10, label: '10 ct', rollValueCents: 400 },
  { cents: 20, label: '20 ct', rollValueCents: 800 },
  { cents: 50, label: '50 ct', rollValueCents: 2000 },
  { cents: 100, label: '1 €', rollValueCents: 2500 },
  { cents: 200, label: '2 €', rollValueCents: 5000 },
]);

export const SAFE_NOTES = Object.freeze([
  { cents: 500, label: '5 €' }, { cents: 1000, label: '10 €' },
  { cents: 2000, label: '20 €' }, { cents: 5000, label: '50 €' },
  { cents: 10000, label: '100 €' }, { cents: 20000, label: '200 €' },
]);

function quantity(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

export function calculateSafeCount({ fixedDrawerCents, littleBerthaCents, looseMoneyCents, coinRollCounts = {}, banknoteCounts = {} }) {
  const rollTotalCents = COIN_ROLLS.reduce((sum, item) => sum + quantity(coinRollCounts[item.cents]) * item.rollValueCents, 0);
  const banknoteTotalCents = SAFE_NOTES.reduce((sum, item) => sum + quantity(banknoteCounts[item.cents]) * item.cents, 0);
  return {
    rollTotalCents,
    banknoteTotalCents,
    countedTotalCents: Number(fixedDrawerCents || 0) + Number(littleBerthaCents || 0) + Number(looseMoneyCents || 0) + rollTotalCents + banknoteTotalCents,
  };
}

export function countTypeLabels(type) {
  if (type === 'morning') return { title: 'Morgendliche Kontrolle', first: 'Frühschicht 1', second: 'Frühschicht 2' };
  if (type === 'handover') return { title: 'Schichtübergabe', first: 'Übernahme durch', second: 'Übergabe durch' };
  return { title: 'Abendzählung', first: 'Spätschicht 1', second: 'Spätschicht 2' };
}
