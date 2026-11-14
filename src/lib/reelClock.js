// Real-time reel clock (project.md P0.6 / Phase 1.5).
//
// Pure builder that turns the projected timeline + live state into the values a
// ticking clock shows: current time, step elapsed, remaining/overrun, the next
// hard-anchor countdown and the DJ cutoff countdown. The React hook
// (`useEventClock`) supplies `now`; nothing here starts a timer.

import { clockToEventDate, formatTimeOfDay, isIsoTimestamp } from './eventTime.js';

export const CLOCK_SKEW_WARNING_MS = 30 * 1000;

function entryStartInstant(entry, { eventDateISO, timeZone }) {
  const raw = entry?.actualTimestamp;
  if (isIsoTimestamp(raw)) return new Date(raw);

  const clock = entry?.actualStart ?? entry?.projectedStart ?? null;
  if (!clock) return null;
  return clockToEventDate({ clock, eventDateISO, timeZone });
}

function entryEndInstant(entry, start, { eventDateISO, timeZone }) {
  if (!entry?.projectedEnd) return null;
  return clockToEventDate({
    clock: entry.projectedEnd,
    eventDateISO,
    timeZone,
    after: start,
  });
}

function anchorInstant(anchor, context) {
  return clockToEventDate({ clock: anchor?.time, ...context });
}

export function buildReelClock({
  activeEntry = null,
  projectedFinish = null,
  hardAnchors = [],
  now = new Date(),
  eventDateISO = null,
  timeZone = 'UTC',
  serverTimeOffsetMs = 0,
  serverTimeAvailable = false,
  isComplete = false,
} = {}) {
  const nowDate = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const context = { eventDateISO, timeZone };

  let active = null;
  if (activeEntry) {
    const startAt = entryStartInstant(activeEntry, context);
    const endAt = entryEndInstant(activeEntry, startAt, context);
    const elapsedSec = startAt ? (nowDate.getTime() - startAt.getTime()) / 1000 : null;
    const remainingSec = endAt ? (endAt.getTime() - nowDate.getTime()) / 1000 : null;

    active = {
      stepId: activeEntry.step?.id ?? null,
      title: activeEntry.step?.title ?? '',
      startAt,
      endAt,
      elapsedSec,
      remainingSec,
      overrunSec: remainingSec != null && remainingSec < 0 ? Math.abs(remainingSec) : 0,
    };
  }

  // Next hard anchor still ahead of the wall clock.
  const anchors = (Array.isArray(hardAnchors) ? hardAnchors : [])
    .map((anchor) => ({ ...anchor, at: anchorInstant(anchor, context) }))
    .filter((anchor) => anchor.at instanceof Date && Number.isFinite(anchor.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const nextAnchorReport =
    anchors.find((anchor) => anchor.at.getTime() >= nowDate.getTime() - 1000) ?? null;
  const nextAnchor = nextAnchorReport
    ? {
        id: nextAnchorReport.id ?? nextAnchorReport.label ?? nextAnchorReport.time,
        label: nextAnchorReport.label ?? 'Hard anchor',
        time: nextAnchorReport.time,
        at: nextAnchorReport.at,
        inSec: (nextAnchorReport.at.getTime() - nowDate.getTime()) / 1000,
      }
    : null;

  // DJ cutoff: an absolute `dj.cutoff` wins; otherwise the active step's
  // actual start + `dj.cutoffSec`.
  let djCutoff = null;
  const dj = activeEntry?.step?.dj ?? null;
  if (dj) {
    let at = null;
    let source = null;

    if (dj.cutoff) {
      at = clockToEventDate({
        clock: dj.cutoff,
        eventDateISO,
        timeZone,
        after: active?.startAt ?? null,
      });
      source = 'absolute';
    } else if (Number.isFinite(dj.cutoffSec) && active?.startAt) {
      at = new Date(active.startAt.getTime() + dj.cutoffSec * 1000);
      source = 'relative';
    }

    if (at instanceof Date && Number.isFinite(at.getTime())) {
      const inSec = (at.getTime() - nowDate.getTime()) / 1000;
      djCutoff = {
        label: dj.cutoff ?? `start + ${dj.cutoffSec}s`,
        at,
        inSec,
        overrunSec: inSec < 0 ? Math.abs(inSec) : 0,
        source,
      };
    }
  }

  const offsetMs = Number.isFinite(serverTimeOffsetMs) ? serverTimeOffsetMs : 0;
  const clockSkewMs = Math.abs(offsetMs);

  return {
    now: nowDate,
    timeZone,
    nowClock: formatTimeOfDay(nowDate, timeZone, { seconds: true }),
    active,
    projectedFinish,
    isComplete: Boolean(isComplete),
    nextAnchor,
    djCutoff,
    serverTimeOffsetMs: offsetMs,
    serverTimeAvailable: Boolean(serverTimeAvailable),
    clockSkewMs,
    isClockSkewed: Boolean(serverTimeAvailable) && clockSkewMs > CLOCK_SKEW_WARNING_MS,
  };
}
