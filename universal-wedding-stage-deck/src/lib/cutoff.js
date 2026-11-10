// Track cutoff stopwatches (project.md TODO 4 / Phase 2).
//
// One cutoff per step: an absolute `dj.cutoff` clock.

import { clockToEventDate, isIsoTimestamp } from './eventTime.js';

function startInstant(entry, context) {
  if (entry?.actualDate instanceof Date && Number.isFinite(entry.actualDate.getTime())) {
    return entry.actualDate;
  }
  if (isIsoTimestamp(entry?.actualTimestamp)) {
    const date = new Date(entry.actualTimestamp);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (entry?.actualStart) {
    return clockToEventDate({ clock: entry.actualStart, ...context });
  }
  return null;
}

function statusFor({ at, inSec, active, done }) {
  if (!at) return 'pending';
  if (done) return 'done';
  if (inSec <= 0) return 'over';
  return active ? 'running' : 'upcoming';
}

export function computeCutoffStopwatches(
  entries = [],
  now = new Date(),
  { eventDateISO = null, timeZone = 'UTC' } = {},
) {
  const nowDate = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const context = { eventDateISO, timeZone };

  return (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const dj = entry?.step?.dj;
      if (!dj?.cutoff) return null;

      const start = startInstant(entry, context);
      const at = clockToEventDate({
        clock: dj.cutoff,
        ...context,
        after: start ?? nowDate,
      });
      const label = dj.cutoff;
      const validAt = at instanceof Date && Number.isFinite(at.getTime());
      const inSec = validAt ? (at.getTime() - nowDate.getTime()) / 1000 : null;

      return {
        stepId: entry.step.id,
        title: entry.step.title,
        active: Boolean(entry.isActive),
        done: Boolean(entry.isDone),
        label,
        at: validAt ? at : null,
        inSec,
        overrunSec: inSec != null && inSec < 0 ? Math.abs(inSec) : 0,
        status: statusFor({ at: validAt ? at : null, inSec: inSec ?? 0, active: entry.isActive, done: entry.isDone }),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Active first, then nearest upcoming/over, then pending, then done.
      const rank = (item) => {
        if (item.active) return 0;
        if (item.status === 'running' || item.status === 'upcoming') return 1;
        if (item.status === 'over') return 2;
        if (item.status === 'pending') return 3;
        return 4;
      };
      const delta = rank(a) - rank(b);
      if (delta !== 0) return delta;
      if (a.at && b.at) return a.at.getTime() - b.at.getTime();
      return 0;
    });
}

export function activeCutoff(stopwatches = []) {
  return stopwatches.find((item) => item.active) ?? null;
}
