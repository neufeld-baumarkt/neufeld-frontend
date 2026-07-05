// src/components/controlling/MoneyCell.jsx

import { forwardRef, useEffect, useRef, useState } from 'react';

function assignRef(ref, value) {
  if (!ref) {
    return;
  }

  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  ref.current = value;
}

function normalizeMoneyValue(value) {
  if (typeof value !== 'string') {
    return value;
  }

  let normalized = value.replace(/[€\s]/g, '').trim();

  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    const dotParts = normalized.split('.');

    if (dotParts.length > 2) {
      normalized = `${dotParts.slice(0, -1).join('')}.${dotParts.at(-1)}`;
    }
  }

  return normalized;
}

function formatMoneyDisplay(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const normalizedValue = normalizeMoneyValue(String(value));
  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue)) {
    return String(value);
  }

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function formatForEditing(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let editableValue = String(value).replace(/[€\s]/g, '').trim();

  if (editableValue.includes(',')) {
    editableValue = editableValue.replace(/\./g, '');
  }

  return editableValue;
}

const MoneyCell = forwardRef(function MoneyCell(
  {
    value = '',
    onChange,
    onCommit,
    onNavigate,
    disabled = false,
    placeholder = '',
  },
  ref
) {
  const inputRef = useRef(null);
  const isFocusedRef = useRef(false);
  const skipNextBlurCommitRef = useRef(false);
  const [displayValue, setDisplayValue] = useState(formatMoneyDisplay(value));

  useEffect(() => {
    if (!isFocusedRef.current) {
      setDisplayValue(formatMoneyDisplay(value));
    }
  }, [value]);

  function setInputRef(inputElement) {
    inputRef.current = inputElement;
    assignRef(ref, inputElement);
  }

  function commit() {
    onCommit?.(normalizeMoneyValue(displayValue));
  }

  function commitAndSkipBlur() {
    skipNextBlurCommitRef.current = true;
    commit();
  }

  return (
    <input
      ref={setInputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      disabled={disabled}
      placeholder={placeholder}
      onFocus={() => {
        isFocusedRef.current = true;
        setDisplayValue(formatForEditing(displayValue));
      }}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDisplayValue(nextValue);
        onChange?.(nextValue);
      }}
      onBlur={() => {
        isFocusedRef.current = false;

        if (skipNextBlurCommitRef.current) {
          skipNextBlurCommitRef.current = false;
          return;
        }

        commit();
        setDisplayValue(formatMoneyDisplay(displayValue));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitAndSkipBlur();
          onNavigate?.(event.shiftKey ? 'up' : 'down');
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          commitAndSkipBlur();
          onNavigate?.('up');
          return;
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          commitAndSkipBlur();
          onNavigate?.('down');
          return;
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          commitAndSkipBlur();
          onNavigate?.('left');
          return;
        }

        if (event.key === 'ArrowRight') {
          event.preventDefault();
          commitAndSkipBlur();
          onNavigate?.('right');
          return;
        }

        if (event.key === 'Tab') {
          commitAndSkipBlur();
          onNavigate?.(event.shiftKey ? 'left' : 'right');
        }
      }}
      className="w-full h-full min-h-[38px] bg-transparent px-2 py-1 text-right text-xs font-semibold text-[#1f1f1f] outline-none border border-transparent focus:border-[#800000] focus:bg-[#fff7f7] disabled:text-black/30 disabled:cursor-not-allowed placeholder:text-black/20"
    />
  );
});

export default MoneyCell;