// Automatic time-drift and projection engine.
//
// The engine turns the synced `live_sync_state` into a schedule report:
// - actual-vs-planned drift for every step that has started
// - a single live drift value for the header / pocket pill
// - projected start/end times for upcoming ELASTIC blocks
//
// Clock math is day-aware so an event that crosses midnight (e.g. 23:50 ->
// 00:10 = +20m) does not produce a 23-hour phantom drift.

import { addMinutesToClock } from './liveStageState.js';
import { buildBufferAccordion } from './bufferAccordion.js';
import { clockDeltaMinutes, clockToMinutes } from './clockMath.js';
import { clockToEventDate, formatClockInZone, isIsoTimestamp } from './eventTime.js';
import { buildHardAnchorRadar } from './hardAnchorRadar.js';
import { buildReelClock } from './reelClock.js';

export { clockDeltaMinutes, clockToMinutes };

export function stepPlannedStart(step) {
  return step?.planned ?? step?.time ?? null;
}

export function computeStepDriftMinutes(step, actualStart) {
  if (!step || typeof actualStart !== 'string') return null;
  return clockDeltaMinutes(stepPlannedStart(step), actualStart);
}

// Backwards-compatible helper used by the Pocket view before the engine.
export function computeDriftMinutes(step, liveState) {
  if (!step) return null;
  return computeStepDriftMinutes(step, liveState?.actual_timestamps?.[step.id]);
}

export function driftLabel(drift) {
  if (drift == null) return null;
  if (drift === 0) return 'ON TIME';
  return drift > 0 ? `+${drift}m LATE` : `${Math.abs(drift)}m AHEAD`;
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
// `durationOverrides` lets the buffer accordion project the recommended
// shortened/extended lengths without mutating the cartridge.
export function buildTimeline(
  steps = [],
  liveState = {},
  { durationOverrides = null, manualOffsetMinutes = 0, eventContext = {} } = {},
) {
  const { eventDateISO = null, timeZone = 'UTC' } = eventContext;
  const completed = new Set(liveState?.completed_step_ids ?? []);
  const actuals = liveState?.actual_timestamps ?? {};
  let cursor = null;

  const entries = steps.map((step, index) => {
    const plannedStart = stepPlannedStart(step);
    const plannedDurationMin = Number.isFinite(step.durationMin) ? step.durationMin : null;
    const override = durationOverrides?.[step.id];
    const durationMin = Number.isFinite(override) ? override : plannedDurationMin;
    const plannedEnd = addMinutesToClock(plannedStart, plannedDurationMin);

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
        // buffer when its slot starts later than the rolling estimate.
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
      plannedDurationMin,
      durationMin,
      durationAdjusted: durationMin !== plannedDurationMin,
      actualDriftMinutes,
      projectedDriftMinutes,
      driftMinutes,
      driftSource,
      driftLabel: driftLabel(driftMinutes),
      driftTone: driftTone(driftMinutes),
      isDone: completed.has(step.id),
      isActive: liveState?.active_step_id === step.id,
      isElastic: step.type === 'ELASTIC',
      isBuffer: step.type === 'BUFFER',
      isHardAnchor: step.type === 'HARD_ANCHOR',
      projectionSource: projectionSource(step, actualStart),
    };
  });

  const offset = Number.isFinite(manualOffsetMinutes)
    ? Math.max(0, Math.min(12 * 60, Math.round(manualOffsetMinutes)))
    : 0;
  const activeIndex = steps.findIndex((step) => step.id === liveState?.active_step_id);
  if (offset <= 0 || activeIndex < 0) return entries;

  // Apply the manual kitchen/vendor offset after the base projection: the
  // active block keeps its real start but ends later, future blocks shift by
  // the same amount, and HARD_ANCHORs stay pinned.
  return entries.map((entry, index) => {
    if (index < activeIndex || entry.isHardAnchor) return entry;

    const isActive = index === activeIndex;
    const startShift = isActive ? 0 : offset;
    const projectedStart =
      entry.projectedStart && startShift
        ? addMinutesToClock(entry.projectedStart, startShift)
        : entry.projectedStart;
    const projectedEnd = entry.projectedEnd
      ? addMinutesToClock(entry.projectedEnd, offset)
      : entry.projectedEnd;
    const projectedDriftMinutes = projectedStart
      ? clockDeltaMinutes(entry.plannedStart, projectedStart)
      : null;
    const driftMinutes = entry.actualDriftMinutes ?? projectedDriftMinutes ?? null;

    return {
      ...entry,
      projectedStart,
      projectedEnd,
      projectedDriftMinutes,
      driftMinutes,
      driftLabel: driftLabel(driftMinutes),
      driftTone: driftTone(driftMinutes),
      manualOffsetMinutes: offset,
    };
  });
}

export function buildDriftReport(
  steps = [],
  liveState = {},
  {
    jokerAvailable = true,
    hardAnchors = [],
    compressionSlackMinutes = 10,
    manualOffsetMinutes = 0,
    now = new Date(),
    eventDateISO = null,
    timeZone = 'UTC',
    serverTimeOffsetMs = 0,
    serverTimeAvailable = false,
  } = {},
) {
  const eventContext = { eventDateISO, timeZone };
  const entries = buildTimeline(steps, liveState, { manualOffsetMinutes, eventContext });
  const activeIndex = entries.findIndex((entry) => entry.isActive);
  const activeEntry = activeIndex >= 0 ? entries[activeIndex] : null;
  const nextEntry = activeIndex >= 0 ? entries[activeIndex + 1] ?? null : null;
  const lastCompletedEntry =
    [...entries].reverse().find((entry) => entry.isDone) ?? null;

  // While a step is live, its actual start is the newest drift sample. When the
  // event is complete, keep showing the final step's sample.
  const currentEntry = activeEntry ?? lastCompletedEntry;
  const currentDriftMinutes = currentEntry?.driftMinutes ?? null;
  const effectiveDriftMinutes =
    currentDriftMinutes == null && !manualOffsetMinutes
      ? null
      : (currentDriftMinutes ?? 0) + manualOffsetMinutes;

  const hardAnchorRadar = buildHardAnchorRadar(hardAnchors, entries, {
    currentEntry,
    compressionSlackMinutes,
  });

  const bufferAccordion = buildBufferAccordion(entries, effectiveDriftMinutes, {
    jokerAvailable,
  });
  const accordionEntries = bufferAccordion.hasChanges
    ? buildTimeline(steps, liveState, {
        durationOverrides: bufferAccordion.durationByStepId,
        manualOffsetMinutes,
        eventContext,
      })
    : entries;

  const projectedFinish = entries.length > 0 ? entries[entries.length - 1].projectedEnd : null;
  const plannedFinish = entries.length > 0 ? entries[entries.length - 1].plannedEnd : null;
  const accordionProjectedFinish =
    accordionEntries.length > 0 ? accordionEntries[accordionEntries.length - 1].projectedEnd : null;

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

  const projectedElasticEntries = entries.filter((entry) => entry.isElastic && !entry.isDone);
  const upcomingElasticEntries = projectedElasticEntries.filter((entry) => !entry.isActive);
  const accordionElasticEntries = accordionEntries.filter(
    (entry) => entry.isElastic && !entry.isDone,
  );

  return {
    entries,
    accordionEntries,
    activeEntry,
    nextEntry,
    lastCompletedEntry,
    currentEntry,
    currentDriftMinutes,
    currentDriftLabel: driftLabel(currentDriftMinutes),
    currentDriftTone: driftTone(currentDriftMinutes),
    currentDriftSource: currentEntry?.driftSource ?? 'none',
    manualOffsetMinutes,
    clock,
    liveOverrunMinutes: clock.active ? clock.active.overrunSec / 60 : 0,
    liveRemainingMinutes:
      clock.active && clock.active.remainingSec != null ? clock.active.remainingSec / 60 : null,
    serverTimeOffsetMs: clock.serverTimeOffsetMs,
    clockSkewMinutes: clock.clockSkewMs / 60000,
    isClockSkewed: clock.isClockSkewed,
    hardAnchorRadar,
    projectedElasticEntries,
    upcomingElasticEntries,
    accordionElasticEntries,
    projectedFinish,
    plannedFinish,
    projectedFinishDeltaMinutes:
      projectedFinish && plannedFinish
        ? clockDeltaMinutes(plannedFinish, projectedFinish)
        : null,
    accordionProjectedFinish,
    accordionProjectedFinishDeltaMinutes:
      accordionProjectedFinish && plannedFinish
        ? clockDeltaMinutes(plannedFinish, accordionProjectedFinish)
        : null,
    bufferAccordion: {
      ...bufferAccordion,
      manualOffsetMinutes,
      baselineProjectedFinish: projectedFinish,
      accordionProjectedFinish,
      accordionFinishDeltaMinutes:
        accordionProjectedFinish && projectedFinish
          ? clockDeltaMinutes(projectedFinish, accordionProjectedFinish)
          : null,
    },
    completedCount: entries.filter((entry) => entry.isDone).length,
    totalCount: entries.length,
    isComplete: eventComplete,
  };
}
