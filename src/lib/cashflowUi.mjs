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

export function getCashflowDetailBookings(bookings = [], selectedBookingId = null) {
  if (selectedBookingId == null) return bookings;

  return bookings.filter(
    (booking) => String(booking.id) === String(selectedBookingId)
  );
}

export function getCashflowCorrectionCategories(categories = [], isRevenue = false) {
  return categories.filter((category) =>
    isRevenue ? Number(category.id) === 1 : Number(category.id) !== 1
  );
}

const CASHFLOW_EDIT_FIELDS = [
  'editKategorieId',
  'editJahr',
  'editKw',
  'editTag',
  'editBetrag',
  'editFiliale',
  'editStatus',
  'editEintragTyp',
  'editNotiz',
  'editRechnungsnummer',
  'editRechnungsdatum',
  'editAvisNummer',
  'editZahlungsart',
  'editDatum',
  'editRechnungsbetragBrutto',
  'editSkontoProzent',
];

export function hasCashflowBookingChanges(initialBookings = [], currentBookings = []) {
  if (initialBookings.length !== currentBookings.length) return true;

  const initialById = new Map(initialBookings.map((booking) => [booking.id, booking]));

  return currentBookings.some((booking) => {
    const initial = initialById.get(booking.id);
    if (!initial) return true;
    return CASHFLOW_EDIT_FIELDS.some((field) => initial[field] !== booking[field]);
  });
}
