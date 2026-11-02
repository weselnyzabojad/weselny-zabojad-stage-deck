import { addMinutesToClock } from './liveStageState.js';

// Projected timeline shared by the DJ Booth and Pocket Remote views. Completed
// and active steps use their logged actual start; upcoming steps roll forward
// from the previous projected end unless a planned buffer or HARD_ANCHOR holds
// them in place.

export function clockToMinutes(clock) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock ?? '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function computeDriftMinutes(step, liveState) {
  if (!step) return null;
  const actual = liveState?.actual_timestamps?.[step.id];
  const planned = step.planned ?? step.time;
  const actualMin = clockToMinutes(actual);
  const plannedMin = clockToMinutes(planned);
  if (actualMin == null || plannedMin == null) return null;
  return actualMin - plannedMin;
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

export function buildTimeline(steps, liveState) {
  const completed = new Set(liveState?.completed_step_ids ?? []);
  const actuals = liveState?.actual_timestamps ?? {};
  let cursor = null;

  return steps.map((step, index) => {
    const plannedStart = step.planned ?? step.time;
    const actualStart = typeof actuals[step.id] === 'string' ? actuals[step.id] : null;
    let projectedStart = actualStart ?? step.realStart ?? null;

    if (!projectedStart) {
      if (step.type === 'HARD_ANCHOR') {
        // Fixed anchors never slide with the rest of the schedule.
        projectedStart = plannedStart;
      } else if (cursor) {
        // Roll forward from the previous step, but respect a planned buffer if
        // it ends later than the rolling estimate.
        const cursorMin = clockToMinutes(cursor);
        const plannedMin = clockToMinutes(plannedStart);
        projectedStart =
          cursorMin != null && plannedMin != null && cursorMin > plannedMin ? cursor : plannedStart;
      } else {
        projectedStart = plannedStart;
      }
    }

    const projectedEnd = projectedStart ? addMinutesToClock(projectedStart, step.durationMin) : null;
    if (projectedEnd) cursor = projectedEnd;

    return {
      step,
      index,
      plannedStart,
      actualStart,
      projectedStart,
      projectedEnd,
      isDone: completed.has(step.id),
      isActive: liveState?.active_step_id === step.id,
    };
  });
}
