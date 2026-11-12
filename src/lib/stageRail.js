// Pure helpers for the MC Stage Rail (SR-01).
//
// The rail reads the existing drift entries and arranges them as past / now /
// future. Nothing here touches the schema, sync layer or the drift engine.

/**
 * Split timeline entries into the three rail zones.
 *
 * - `done` is reversed so the most recent completed step sits nearest the hero.
 * - `upcoming` is kept in timeline order so the next step sits nearest the hero.
 * - When no entry is active, an all-done timeline becomes fully `done`; a
 *   partially done timeline is shown as `upcoming` (current is null).
 *
 * @param {Array<object>} entries drift entries (`step`, `index`, `isActive`, …)
 * @param {number} [activeIndex] index of the active entry; defaults to the
 *   first entry flagged `isActive`.
 * @returns {{ done: object[], current: object|null, upcoming: object[] }}
 */
export function buildStageRail(entries, activeIndex) {
  const list = Array.isArray(entries) ? entries : [];
  if (list.length === 0) {
    return { done: [], current: null, upcoming: [] };
  }

  const index = Number.isInteger(activeIndex)
    ? activeIndex
    : list.findIndex((entry) => entry?.isActive);

  if (index >= 0 && index < list.length) {
    return {
      done: list.slice(0, index).reverse(),
      current: list[index] ?? null,
      upcoming: list.slice(index + 1),
    };
  }

  const allDone = list.every((entry) => entry?.isDone);
  if (allDone) {
    return { done: [...list].reverse(), current: null, upcoming: [] };
  }

  return { done: [], current: null, upcoming: [...list] };
}

/**
 * Compact "start–end" label for a step card. Falls back to the planned time or
 * an em dash so the rail never renders "undefined".
 *
 * @param {object} entry drift entry
 * @returns {string}
 */
export function stageRailSummary(entry) {
  const start = entry?.projectedStart ?? entry?.step?.time ?? null;
  const end = entry?.projectedEnd ?? null;

  if (start && end) return `${start}–${end}`;
  if (start) return String(start);
  return '—';
}

/**
 * One-open-per-rail reducer. Opening the already-open card closes it.
 *
 * @param {Record<string, string|null>} state
 * @param {'done'|'upcoming'} zone
 * @param {string} key
 */
export function toggleRailOpen(state, zone, key) {
  const current = state?.[zone] ?? null;
  return { ...(state ?? {}), [zone]: current === key ? null : key };
}

/**
 * Next focus index for roving keyboard navigation within a rail.
 * Returns -1 for keys that are not navigation keys.
 *
 * @param {string} key keyboard event key
 * @param {number} index current card index
 * @param {number} length number of cards in the rail
 */
export function nextFocusIndex(key, index, length) {
  if (!Number.isInteger(index) || index < 0 || !Number.isInteger(length) || length <= 0) {
    return -1;
  }

  switch (key) {
    case 'ArrowDown':
      return (index + 1) % length;
    case 'ArrowUp':
      return (index - 1 + length) % length;
    case 'Home':
      return 0;
    case 'End':
      return length - 1;
    default:
      return -1;
  }
}
