// src/components/controlling/excelNavigation.js

export function createCellKey({ blockKey, rowIndex, columnIndex }) {
  return `${blockKey}:${rowIndex}:${columnIndex}`;
}

export function parseCellKey(cellKey) {
  if (!cellKey || typeof cellKey !== 'string') {
    return null;
  }

  const [blockKey, rowIndexRaw, columnIndexRaw] = cellKey.split(':');

  const rowIndex = Number(rowIndexRaw);
  const columnIndex = Number(columnIndexRaw);

  if (
    !blockKey ||
    !Number.isInteger(rowIndex) ||
    !Number.isInteger(columnIndex)
  ) {
    return null;
  }

  return {
    blockKey,
    rowIndex,
    columnIndex,
  };
}

export function getNextCellKey({
  currentKey,
  direction,
  maxRowIndex,
  maxColumnIndex,
}) {
  const current = parseCellKey(currentKey);

  if (!current) {
    return null;
  }

  let nextRowIndex = current.rowIndex;
  let nextColumnIndex = current.columnIndex;

  if (direction === 'up') {
    nextRowIndex -= 1;
  }

  if (direction === 'down') {
    nextRowIndex += 1;
  }

  if (direction === 'left') {
    nextColumnIndex -= 1;
  }

  if (direction === 'right') {
    nextColumnIndex += 1;
  }

  if (
    nextRowIndex < 0 ||
    nextColumnIndex < 0 ||
    nextRowIndex > maxRowIndex ||
    nextColumnIndex > maxColumnIndex
  ) {
    return null;
  }

  return createCellKey({
    blockKey: current.blockKey,
    rowIndex: nextRowIndex,
    columnIndex: nextColumnIndex,
  });
}

export function focusRegisteredCell(cellRefs, cellKey) {
  if (!cellRefs?.current || !cellKey) {
    return false;
  }

  const inputElement = cellRefs.current[cellKey];

  if (!inputElement) {
    return false;
  }

  window.requestAnimationFrame(() => {
    inputElement.focus();
    inputElement.select();
  });

  return true;
}