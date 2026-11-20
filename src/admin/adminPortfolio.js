// Pure portfolio table helpers for the owner Overview tab (issue #1211).
// Filtering by year/status/package/language happens in `portfolio_kpis`; only
// free-text search and sorting happen in the browser.

export const PORTFOLIO_STATUSES = ['all', 'active', 'archived'];

const searchable = (row) =>
  [
    row.couple,
    row.id,
    row.date,
    row.dateISO,
    row.servicePackage,
    row.country,
    row.city,
    row.venueName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export function searchPortfolioRows(rows, query) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return Array.isArray(rows) ? rows : [];
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    searchable(row).includes(needle),
  );
}

function compareValues(left, right) {
  const leftMissing = left == null || left === '';
  const rightMissing = right == null || right === '';
  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing ? 1 : -1;
  }
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right);
  return String(left).localeCompare(String(right));
}

export function sortPortfolioRows(rows, key, direction = 'asc') {
  const list = Array.isArray(rows) ? [...rows] : [];
  if (!key) return list;
  const factor = direction === 'desc' ? -1 : 1;
  return list.sort((left, right) => {
    const leftValue = left?.[key];
    const rightValue = right?.[key];
    const leftMissing = leftValue == null || leftValue === '';
    const rightMissing = rightValue == null || rightValue === '';
    if (leftMissing || rightMissing) {
      if (leftMissing && rightMissing) return 0;
      return leftMissing ? 1 : -1;
    }
    return compareValues(leftValue, rightValue) * factor;
  });
}

export function nextPortfolioSort(current, key) {
  if (current?.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key, direction: key === 'couple' || key === 'servicePackage' ? 'asc' : 'desc' };
}

export function portfolioYears(rows) {
  const years = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const year = String(row?.dateISO ?? '').slice(0, 4);
    if (/^\d{4}$/.test(year)) years.add(year);
  }
  return [...years].sort((left, right) => right.localeCompare(left));
}
