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
import { buildHardAnchorRadar } from './hardAnchorRadar.js';

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
export function buildTimeline(steps = [], liveState = {}, { durationOverrides = null } = {}) {
  const completed = new Set(liveState?.completed_step_ids ?? []);
  const actuals = liveState?.actual_timestamps ?? {};
  let cursor = null;

  return steps.map((step, index) => {
    const plannedStart = stepPlannedStart(step);
    const plannedDurationMin = Number.isFinite(step.durationMin) ? step.durationMin : null;
    const override = durationOverrides?.[step.id];
    const durationMin = Number.isFinite(override) ? override : plannedDurationMin;
    const plannedEnd = addMinutesToClock(plannedStart, plannedDurationMin);
    const actualStart = typeof actuals[step.id] === 'string' ? actuals[step.id] : null;
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

    const actualDriftMinutes = actualStart
      ? clockDeltaMinutes(plannedStart, actualStart)
      : null;
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
}

export function buildDriftReport(
  steps = [],
  liveState = {},
  {
    jokerAvailable = true,
    hardAnchors = [],
    compressionSlackMinutes = 10,
  } = {},
) {
  const entries = buildTimeline(steps, liveState);
  const activeIndex = entries.findIndex((entry) => entry.isActive);
  const activeEntry = activeIndex >= 0 ? entries[activeIndex] : null;
  const nextEntry = activeIndex >= 0 ? entries[activeIndex + 1] ?? null : null;
  const lastCompletedEntry =
    [...entries].reverse().find((entry) => entry.isDone) ?? null;

  // While a step is live, its actual start is the newest drift sample. When the
  // event is complete, keep showing the final step's sample.
  const currentEntry = activeEntry ?? lastCompletedEntry;
  const currentDriftMinutes = currentEntry?.driftMinutes ?? null;

  const hardAnchorRadar = buildHardAnchorRadar(hardAnchors, entries, {
    currentEntry,
    compressionSlackMinutes,
  });

  const bufferAccordion = buildBufferAccordion(entries, currentDriftMinutes, {
    jokerAvailable,
  });
  const accordionEntries = bufferAccordion.hasChanges
    ? buildTimeline(steps, liveState, {
        durationOverrides: bufferAccordion.durationByStepId,
      })
    : entries;

  const projectedFinish = entries.length > 0 ? entries[entries.length - 1].projectedEnd : null;
  const plannedFinish = entries.length > 0 ? entries[entries.length - 1].plannedEnd : null;
  const accordionProjectedFinish =
    accordionEntries.length > 0 ? accordionEntries[accordionEntries.length - 1].projectedEnd : null;

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
      baselineProjectedFinish: projectedFinish,
      accordionProjectedFinish,
      accordionFinishDeltaMinutes:
        accordionProjectedFinish && projectedFinish
          ? clockDeltaMinutes(projectedFinish, accordionProjectedFinish)
          : null,
    },
    completedCount: entries.filter((entry) => entry.isDone).length,
    totalCount: entries.length,
    isComplete: entries.length > 0 && entries.every((entry) => entry.isDone),
  };
}
