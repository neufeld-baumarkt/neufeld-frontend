const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function getIsoDateParts(date) {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const utc = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()));
  const dayNumber = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNumber);
  const year = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const kw = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return { jahr: year, kw, tag: WEEKDAYS[dayNumber - 1] };
}

export function calculatePlannedInvoiceAmount(grossAmount, skontoRate = 0) {
  return Math.round(Number(grossAmount) * (1 - Number(skontoRate) / 100) * 100) / 100;
}
