import { clockToEventDate } from './eventTime.js';

// Before the first step starts, the timeline must show no completed history and
// the first step as current. After start, keep the live-state-derived entries.
export function applyTimeAwareStart(entries = [], { now = new Date(), eventDateISO = null, timeZone = 'UTC' } = {}) {
  if (!Array.isArray(entries) || entries.length === 0) return entries;
  const first = entries[0];
  const firstClock = first?.step?.planned ?? first?.step?.time ?? null;
  const firstStart = firstClock
    ? clockToEventDate({ clock: firstClock, eventDateISO, timeZone, after: now })
    : null;
  if (!firstStart || now.getTime() >= firstStart.getTime()) return entries;

  return entries.map((entry, index) => ({
    ...entry,
    isDone: false,
    isActive: index === 0,
  }));
}
