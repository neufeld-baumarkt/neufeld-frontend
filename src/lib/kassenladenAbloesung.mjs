export function activeOpeningForDrawer(activeOpenings, drawerNumber) {
  return (Array.isArray(activeOpenings) ? activeOpenings : []).find((opening) => (
    Number(opening?.drawerNumber) === Number(drawerNumber)
    && (opening?.lifecycleStatus || 'active') === 'active'
  )) || null;
}

export function replacementStage(activeOpening) {
  return activeOpening?.id ? 'occupied-drawer' : 'count';
}

export function replacementOpeningId(activeOpening, replacementConfirmed) {
  return replacementConfirmed === true ? activeOpening?.id || null : null;
}
