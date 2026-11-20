// Shared timeline focus-stack rules (project.md, decision 2026-11-07).
//
// Every role view and every viewport uses the same depth model: one floating
// current step, at most two completed steps behind it and at most two future
// steps ahead of it. Older/farther entries are not dimmed — they are excluded
// from the stack (and therefore from the DOM and assistive reading order).
//
// This module is pure so the limits and tiers can be unit-tested without React.

import { buildStageRail } from './stageRail.js';

/** Hard visibility limits shared by MC, DJ, Photographer and Speaker. */
export const FOCUS_STACK_LIMITS = Object.freeze({
  history: 2,
  future: 2,
});

/**
 * Shared depth tiers.
 *
 * - `depth` is the stacking distance from the floating current card (0).
 * - `opacity` and `scale` express the visual recession of the second row.
 * - `zIndex` keeps the current card above both history and future cards.
 *
 * The current card is the only tier that is fully opaque and unscaled.
 */
export const FOCUS_STACK_TIERS = Object.freeze({
  current: Object.freeze({ depth: 0, opacity: 1, scale: 1, zIndex: 30 }),
  history: Object.freeze([
    Object.freeze({ depth: 1, opacity: 1, scale: 1, zIndex: 20 }),
    Object.freeze({ depth: 2, opacity: 0.65, scale: 0.95, zIndex: 10 }),
  ]),
  future: Object.freeze([
    Object.freeze({ depth: 1, opacity: 1, scale: 1, zIndex: 20 }),
    Object.freeze({ depth: 2, opacity: 0.65, scale: 0.95, zIndex: 10 }),
  ]),
});

/**
 * Resolve the shared depth tier for a card.
 *
 * @param {'current'|'history'|'future'} zone
 * @param {number} [position] zero-based position within the zone (nearest first)
 * @returns {{ depth: number, opacity: number, scale: number, zIndex: number } | null}
 */
export function focusStackTier(zone, position = 0) {
  if (zone === 'current') return FOCUS_STACK_TIERS.current;
  const tiers = FOCUS_STACK_TIERS[zone];
  if (!Array.isArray(tiers) || !Number.isInteger(position) || position < 0) {
    return null;
  }
  return tiers[position] ?? null;
}

/**
 * Build the universal focus stack from drift/timeline entries.
 *
 * The zones are derived with the existing `buildStageRail` split so every role
 * keeps the same active/done/upcoming semantics, then clamped to the shared
 * visibility limits. `history` and `future` are ordered nearest-first: the
 * entry immediately before/after the current step is at index 0.
 *
 * @param {Array<object>} entries drift entries (`step`, `index`, `isActive`, …)
 * @param {number} [activeIndex] index of the active entry; defaults to the
 *   first entry flagged `isActive`.
 * @param {{ historyLimit?: number, futureLimit?: number }} [options]
 * @returns {{
 *   current: object|null,
 *   history: object[],
 *   future: object[],
 *   hidden: { history: number, future: number },
 *   counts: { current: number, history: number, future: number },
 *   total: number,
 * }}
 */
export function buildFocusStack(entries, activeIndex, options = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const historyLimit = Number.isInteger(options.historyLimit)
    ? Math.max(0, options.historyLimit)
    : FOCUS_STACK_LIMITS.history;
  const futureLimit = Number.isInteger(options.futureLimit)
    ? Math.max(0, options.futureLimit)
    : FOCUS_STACK_LIMITS.future;

  const rail = buildStageRail(list, activeIndex);
  const history = rail.done.slice(0, historyLimit);
  const future = rail.upcoming.slice(0, futureLimit);

  return {
    current: rail.current,
    history,
    future,
    hidden: {
      history: Math.max(0, rail.done.length - history.length),
      future: Math.max(0, rail.upcoming.length - future.length),
    },
    counts: {
      current: rail.current ? 1 : 0,
      history: history.length,
      future: future.length,
    },
    total: list.length,
  };
}
