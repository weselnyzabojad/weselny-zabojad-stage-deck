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

const MINUTES_PER_DAY = 24 * 60;
const MAX_CLOCK_DELTA = MINUTES_PER_DAY / 2;

export function clockToMinutes(clock) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock ?? '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Signed difference `to - from`. When the raw difference crosses midnight,
// fold it into the shorter path so 00:10 against 23:50 reads as +20 minutes.
export function clockDeltaMinutes(fromClock, toClock) {
  const from = clockToMinutes(fromClock);
  const to = clockToMinutes(toClock);
  if (from == null || to == null) return null;

  let delta = to - from;
  if (delta > MAX_CLOCK_DELTA) delta -= MINUTES_PER_DAY;
  if (delta < -MAX_CLOCK_DELTA) delta += MINUTES_PER_DAY;
  return delta;
}

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
export function buildTimeline(steps = [], liveState = {}) {
  const completed = new Set(liveState?.completed_step_ids ?? []);
  const actuals = liveState?.actual_timestamps ?? {};
  let cursor = null;

  return steps.map((step, index) => {
    const plannedStart = stepPlannedStart(step);
    const plannedEnd = addMinutesToClock(plannedStart, step.durationMin);
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

    const projectedEnd = addMinutesToClock(projectedStart, step.durationMin);
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

export function buildDriftReport(steps = [], liveState = {}) {
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
  const projectedFinish = entries.length > 0 ? entries[entries.length - 1].projectedEnd : null;
  const plannedFinish = entries.length > 0 ? entries[entries.length - 1].plannedEnd : null;

  const projectedElasticEntries = entries.filter((entry) => entry.isElastic && !entry.isDone);
  const upcomingElasticEntries = projectedElasticEntries.filter((entry) => !entry.isActive);

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
    projectedElasticEntries,
    upcomingElasticEntries,
    projectedFinish,
    plannedFinish,
    projectedFinishDeltaMinutes:
      projectedFinish && plannedFinish
        ? clockDeltaMinutes(plannedFinish, projectedFinish)
        : null,
    completedCount: entries.filter((entry) => entry.isDone).length,
    totalCount: entries.length,
    isComplete: entries.length > 0 && entries.every((entry) => entry.isDone),
  };
}
