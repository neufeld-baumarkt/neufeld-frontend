export const DEFAULT_EMPLOYEE_PIN = '0000';

export function needsPersonalPinSetup(pin) {
  return String(pin || '') === DEFAULT_EMPLOYEE_PIN;
}

export function isTrivialPersonalPin(pin) {
  const value = String(pin || '');
  if (/^(\d)\1{3}$/.test(value)) return true;
  if (!/^\d{4}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const follows = (step) => digits.slice(1).every((digit, index) => (
    digit === (digits[index] + step + 10) % 10
  ));
  return follows(1) || follows(-1);
}

export function personalPinError(pin, confirmation) {
  if (!/^\d{4}$/.test(String(pin || '')) || !/^\d{4}$/.test(String(confirmation || ''))) {
    return 'Der persönliche PIN muss genau vier Ziffern haben.';
  }
  if (pin === DEFAULT_EMPLOYEE_PIN) return '0000 darf nicht als persönlicher PIN verwendet werden.';
  if (isTrivialPersonalPin(pin)) {
    return 'Der persönliche PIN darf weder aus vier gleichen Ziffern noch aus einer auf- oder absteigenden Zahlenfolge bestehen.';
  }
  if (pin !== confirmation) return 'Die beiden PIN-Eingaben stimmen nicht überein.';
  return null;
}
