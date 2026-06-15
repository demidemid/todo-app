export const getChecklistBadgePalette = (closedItems: number, totalItems: number): string => {
  if (totalItems <= 0) {
    return 'border-rose-300/30 bg-rose-300/15 text-rose-100';
  }

  const percent = (closedItems / totalItems) * 100;

  if (percent < 25) {
    return 'border-rose-300/30 bg-rose-300/15 text-rose-100';
  }

  if (percent < 75) {
    return 'border-amber-300/35 bg-amber-300/15 text-amber-100';
  }

  return 'border-emerald-300/35 bg-emerald-300/15 text-emerald-100';
};
