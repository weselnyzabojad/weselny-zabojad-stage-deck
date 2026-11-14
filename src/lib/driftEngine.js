// Automatic time-drift and projection engine.
//
// The engine turns the synced `live_sync_state` into a schedule report:
// - actual-vs-planned drift for every step that has started
// - a single live drift value for the header / pocket pill
// - projected start/end times for upcoming FLEXIBLE blocks
//
// Clock math is day-aware so an event that crosses midnight (e.g. 23:50 ->
// 00:10 = +20m) does not produce a 23-hour phantom drift.

import { addMinutesToClock } from './liveStageState.js';
import { t } from '../i18n/index.js';
import { clockDeltaMinutes, clockToMinutes } from './clockMath.js';
import {
  clockToEventDate,
  formatClockInZone,
  formatCountdown,
  isIsoTimestamp,
} from './eventTime.js';
import { buildHardAnchorRadar } from './hardAnchorRadar.js';
import { buildReelClock } from './reelClock.js';
import { calculateStepDurations } from './stepDurations.js';

export { clockDeltaMinutes, clockToMinutes };

export function stepPlannedStart(step) {
  return step?.planned ?? step?.time ?? null;
}

export function computeStepDriftMinutes(step, actualStart, context = {}) {
  if (!step || typeof actualStart !== 'string') return null;
  const plannedStart = stepPlannedStart(step);

  // ISO actuals compare absolute instants, so midnight and DST do not hit the
  // old ±12h fold limit of `clockDeltaMinutes`.
  if (isIsoTimestamp(actualStart)) {
    const actualDate = new Date(actualStart);
    if (!Number.isFinite(actualDate.getTime())) return null;
    const plannedDate = clockToEventDate({
      clock: plannedStart,
      eventDateISO: context.eventDateISO ?? null,
      timeZone: context.timeZone ?? 'UTC',
      after: actualDate,
    });
    if (!plannedDate) return null;
    return Math.round((actualDate.getTime() - plannedDate.getTime()) / 60000);
  }

  return clockDeltaMinutes(plannedStart, actualStart);
}

// Backwards-compatible helper used by the Pocket view before the engine.
export function computeDriftMinutes(step, liveState, context = {}) {
  if (!step) return null;
  return computeStepDriftMinutes(step, liveState?.actual_timestamps?.[step.id], context);
}

export function driftLabel(drift) {
  if (drift == null) return null;
  if (drift === 0) return t('drift.onTime');
  return drift > 0
    ? t('drift.late', { minutes: drift })
    : t('drift.ahead', { minutes: Math.abs(drift) });
}

export function driftTone(drift) {
  if (drift == null) return 'unknown';
  if (drift > 0) return 'late';
  if (drift < 0) return 'early';
  return 'ontime';
}

function projectionSource(step, actualStart) {
  if (actualStart) return 'actual';
  if (step?.realStart) return 'realStart';
  if (step?.type === 'HARD_ANCHOR') return 'anchor';
  return 'projected';
}

// Build one enriched entry per step. Existing callers of `buildTimeline` keep
// working; the extra drift fields are what the engine report consumes.
export function buildTimeline(
  steps = [],
  liveState = {},
  { eventContext = {} } = {},
) {
  const { eventDateISO = null, timeZone = 'UTC' } = eventContext;
  const completed = new Set(liveState?.completed_step_ids ?? []);
  const actuals = liveState?.actual_timestamps ?? {};
  const closureTime =
    steps.find((step) => step?.mandatory?.kind === 'CLOSURE')?.time ?? null;
  const { durations } = calculateStepDurations(steps, { closureTime });
  let cursor = null;

  const entries = steps.map((step, index) => {
    const plannedStart = stepPlannedStart(step);
    const durationMin = Number.isFinite(durations[index]) ? durations[index] : null;
    const plannedEnd = addMinutesToClock(plannedStart, durationMin);

    // TODO 23: actual starts are ISO internally; legacy HH:MM still loads and
    // is rendered as-is until the normalizer upgrades it.
    const actualTimestamp =
      typeof actuals[step.id] === 'string' ? actuals[step.id] : null;
    const actualDate = isIsoTimestamp(actualTimestamp) ? new Date(actualTimestamp) : null;
    const actualStart = actualTimestamp
      ? actualDate
        ? formatClockInZone(actualDate, timeZone)
        : actualTimestamp
      : null;

    let projectedStart = actualStart ?? step.realStart ?? null;

    if (!projectedStart) {
      if (step.type === 'HARD_ANCHOR') {
        // Fixed anchors never slide with the rest of the schedule.
        projectedStart = plannedStart;
      } else if (cursor) {
        // Roll forward from the previous projected end, but respect a planned
        // slot when it starts later than the rolling estimate.
        const cursorAhead = clockDeltaMinutes(plannedStart, cursor);
        projectedStart = cursorAhead != null && cursorAhead > 0 ? cursor : plannedStart;
      } else {
        projectedStart = plannedStart;
      }
    }

    const projectedEnd = addMinutesToClock(projectedStart, durationMin);
    if (projectedEnd) cursor = projectedEnd;

    // Absolute ISO actuals remove the ±12h fold limit of clockDeltaMinutes.
    let actualDriftMinutes = null;
    if (actualDate && plannedStart) {
      const plannedDate = clockToEventDate({
        clock: plannedStart,
        eventDateISO,
        timeZone,
        after: actualDate,
      });
      if (plannedDate) {
        actualDriftMinutes = Math.round((actualDate.getTime() - plannedDate.getTime()) / 60000);
      }
    }
    if (actualDriftMinutes == null && actualStart) {
      actualDriftMinutes = clockDeltaMinutes(plannedStart, actualStart);
    }

    const projectedDriftMinutes = projectedStart
      ? clockDeltaMinutes(plannedStart, projectedStart)
      : null;
    const driftMinutes = actualDriftMinutes ?? projectedDriftMinutes ?? null;
    const driftSource =
      actualDriftMinutes != null
        ? 'actual'
        : projectedDriftMinutes != null
          ? 'projected'
          : 'none';

    return {
      step,
      index,
      plannedStart,
      plannedEnd,
      actualStart,
      actualTimestamp,
      actualDate,
      projectedStart,
      projectedEnd,
      durationMin,
      actualDriftMinutes,
      projectedDriftMinutes,
      driftMinutes,
      driftSource,
      driftLabel: driftLabel(driftMinutes),
      driftTone: driftTone(driftMinutes),
      isDone: completed.has(step.id),
      isActive: liveState?.active_step_id === step.id,
      isHardAnchor: step.type === 'HARD_ANCHOR',
      projectionSource: projectionSource(step, actualStart),
    };
  });

  return entries;
}

// Seconds until the next step starts. While a step is live its projected end is
// the next start; before the event it is the first planned start. This drives
// the green "on time" header pill, so it must use the same clock and timezone as
// the rest of the report.
function computeNextStepInSec(entries, clock, { now, eventDateISO, timeZone }) {
  if (clock?.active?.remainingSec != null) return clock.active.remainingSec;

  const upcoming = entries.find((entry) => !entry.isDone && !entry.isActive);
  if (!upcoming?.projectedStart) return null;

  const at = clockToEventDate({
    clock: upcoming.projectedStart,
    eventDateISO,
    timeZone,
    after: now,
  });
  return at instanceof Date && Number.isFinite(at.getTime())
    ? (at.getTime() - now.getTime()) / 1000
    : null;
}

export function buildDriftReport(
  steps = [],
  liveState = {},
  {
    hardAnchors = [],
    compressionSlackMinutes = 10,
    now = new Date(),
    eventDateISO = null,
    timeZone = 'UTC',
    serverTimeOffsetMs = 0,
    serverTimeAvailable = false,
  } = {},
) {
  const eventContext = { eventDateISO, timeZone };
  const entries = buildTimeline(steps, liveState, { eventContext });
  const activeIndex = entries.findIndex((entry) => entry.isActive);
  const activeEntry = activeIndex >= 0 ? entries[activeIndex] : null;
  const nextEntry = activeIndex >= 0 ? entries[activeIndex + 1] ?? null : null;
  const lastCompletedEntry =
    [...entries].reverse().find((entry) => entry.isDone) ?? null;

  // While a step is live, its actual start is the newest drift sample. When the
  // event is complete, keep showing the final step's sample.
  const currentEntry = activeEntry ?? lastCompletedEntry;

  const projectedFinish = entries.length > 0 ? entries[entries.length - 1].projectedEnd : null;
  const plannedFinish = entries.length > 0 ? entries[entries.length - 1].plannedEnd : null;

  // Live reel clock: recomputed from `now` on every tick so overruns,
  // anchor countdowns and DJ cutoffs move without a step transition.
  const eventComplete = entries.length > 0 && entries.every((entry) => entry.isDone);
  const clock = buildReelClock({
    activeEntry,
    projectedFinish,
    hardAnchors,
    now,
    eventDateISO,
    timeZone,
    serverTimeOffsetMs,
    serverTimeAvailable,
    isComplete: eventComplete,
  });
  const liveOverrunMinutes = clock.active ? clock.active.overrunSec / 60 : 0;
  const nextStepInSec = computeNextStepInSec(entries, clock, {
    now,
    eventDateISO,
    timeZone,
  });

  // P0.5: one canonical drift value for the header, radar, Pocket and DJ.
  // The displayed lateness is the newest actual-vs-planned sample plus any live
  // overrun of the active step. Keeping only the start sample made the header
  // stay at the step-start value while the live schedule slipped further.
  const startDriftMinutes = currentEntry?.actualDriftMinutes ?? null;
  const projectedDriftMinutes = currentEntry?.projectedDriftMinutes ?? null;
  const canonicalDriftMinutes =
    startDriftMinutes == null ? null : Math.round(startDriftMinutes + liveOverrunMinutes);
  const canonicalDriftLabel = driftLabel(canonicalDriftMinutes);
  const canonicalDriftTone = driftTone(canonicalDriftMinutes);
  const canonicalDriftSource =
    canonicalDriftMinutes == null ? 'none' : liveOverrunMinutes > 0 ? 'live' : 'actual';

  const hardAnchorRadar = buildHardAnchorRadar(hardAnchors, entries, {
    currentEntry,
    compressionSlackMinutes,
  });

  const currentDriftMinutes = canonicalDriftMinutes;
  const liveRemainingMinutes =
    clock.active && clock.active.remainingSec != null ? clock.active.remainingSec / 60 : null;

  // Everything the UI needs to render the one canonical pill, plus the
  // component values required to explain it in a tooltip.
  const drift = {
    startDriftMinutes,
    projectedDriftMinutes,
    liveOverrunMinutes,
    liveRemainingMinutes,
    canonicalDriftMinutes,
    canonicalDriftLabel,
    canonicalDriftTone,
    canonicalDriftSource,
    nextStepInSec,
    detail: [
      startDriftMinutes != null
        ? t('drift.start', { label: driftLabel(startDriftMinutes) })
        : null,
      projectedDriftMinutes != null
        ? t('drift.projected', { label: driftLabel(projectedDriftMinutes) })
        : null,
      clock.active
        ? liveOverrunMinutes > 0
          ? t('drift.liveOver', { minutes: Math.round(liveOverrunMinutes) })
          : `live ${Math.abs(Math.round(liveRemainingMinutes ?? 0))}m left`
        : null,
      nextStepInSec > 0
        ? t('drift.nextStepIn', { time: formatCountdown(nextStepInSec) })
        : null,
    ]
      .filter(Boolean)
      .join(' · '),
  };

  return {
    entries,
    activeEntry,
    nextEntry,
    lastCompletedEntry,
    currentEntry,
    currentDriftMinutes,
    currentDriftLabel: driftLabel(currentDriftMinutes),
    currentDriftTone: driftTone(currentDriftMinutes),
    currentDriftSource: currentEntry?.driftSource ?? 'none',
    canonicalDriftMinutes,
    canonicalDriftLabel,
    canonicalDriftTone,
    canonicalDriftSource,
    drift,
    clock,
    liveOverrunMinutes,
    liveRemainingMinutes: liveRemainingMinutes,
    serverTimeOffsetMs: clock.serverTimeOffsetMs,
    clockSkewMinutes: clock.clockSkewMs / 60000,
    isClockSkewed: clock.isClockSkewed,
    hardAnchorRadar,
    projectedFinish,
    plannedFinish,
    projectedFinishDeltaMinutes:
      projectedFinish && plannedFinish
        ? clockDeltaMinutes(plannedFinish, projectedFinish)
        : null,
    completedCount: entries.filter((entry) => entry.isDone).length,
    totalCount: entries.length,
    isComplete: eventComplete,
  };
}
