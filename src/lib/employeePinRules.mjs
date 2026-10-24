export const DEFAULT_EMPLOYEE_PIN = '0000';

export function needsPersonalPinSetup(pin) {
  return String(pin || '') === DEFAULT_EMPLOYEE_PIN;
}

export function personalPinError(pin, confirmation) {
  if (!/^\d{4}$/.test(String(pin || '')) || !/^\d{4}$/.test(String(confirmation || ''))) {
    return 'Der persönliche PIN muss genau vier Ziffern haben.';
  }
  if (pin === DEFAULT_EMPLOYEE_PIN) return '0000 darf nicht als persönlicher PIN verwendet werden.';
  if (pin !== confirmation) return 'Die beiden PIN-Eingaben stimmen nicht überein.';
  return null;
}
