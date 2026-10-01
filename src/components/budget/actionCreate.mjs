export function parseActionNumber(value) {
  const actionNumber = String(value ?? '').trim().toUpperCase();

  if (!actionNumber) {
    return { ok: false, message: 'Aktionsnummer ist Pflicht.' };
  }

  if (!/^[AS]\d{5}$/.test(actionNumber)) {
    return {
      ok: false,
      message: 'Ungültige Aktionsnummer. Erlaubt sind A oder S gefolgt von fünf Ziffern, z. B. A02645.'
    };
  }

  const jahr = 2000 + Number(actionNumber.slice(2, 4));
  const kw = Number(actionNumber.slice(4, 6));
  if (!Number.isInteger(kw) || kw < 1 || kw > 53) {
    return { ok: false, message: 'Ungültige Aktionsnummer. Die KW muss zwischen 01 und 53 liegen.' };
  }

  return { ok: true, aktion_nr: actionNumber, jahr, kw };
}

export function parseActionAmount(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function buildActionPayload(actionNumberValue, branchRows, remarkValue = '') {
  const parsedAction = parseActionNumber(actionNumberValue);
  if (!parsedAction.ok) return parsedAction;

  const selectedRows = (Array.isArray(branchRows) ? branchRows : []).filter((row) => row?.enabled);
  if (selectedRows.length === 0) {
    return { ok: false, message: 'Mindestens eine Filiale muss ausgewählt sein.' };
  }

  const filialen = [];
  for (const row of selectedRows) {
    const amount = parseActionAmount(row.amount);
    if (amount === null || amount <= 0) {
      return {
        ok: false,
        message: `Betrag für ${row.name || 'die ausgewählte Filiale'} ist Pflicht und muss größer als 0 sein.`
      };
    }
    filialen.push({ filiale: row.name, betrag: Math.round(amount * 100) / 100 });
  }

  const beschreibung = String(remarkValue ?? '').trim();
  const payload = { aktion_nr: parsedAction.aktion_nr, filialen };
  if (beschreibung) payload.beschreibung = beschreibung;

  return {
    ok: true,
    target: parsedAction,
    payload
  };
}
