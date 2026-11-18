// Shared post-event timing analytics (issue #1190).
//
// The same delta and status definitions feed the recap table and the MC
// post-mortem dashboard so they can never disagree.

import { clockDeltaMinutes, clockToMinutes } from './clockMath.js';
import { calculateStepDurations } from './stepDurations.js';

const TIMING_STATUSES = Object.freeze(['on-time', 'late', 'early', 'missing']);

function clockPart(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  const direct = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (direct) {
    const hour = Number(direct[1]);
    const minute = Number(direct[2]);
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, '0')}:${direct[2]}`;
  }
  const iso = /\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/.exec(text);
  if (iso) {
    const hour = Number(iso[1]);
    const minute = Number(iso[2]);
    if (hour > 23 || minute > 59) return null;
    return `${iso[1]}:${iso[2]}`;
  }
  return null;
}

function addMinutes(clock, minutes) {
  const base = clockToMinutes(clock);
  if (base == null || !Number.isFinite(minutes)) return null;
  const total = ((base + Math.round(minutes)) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function calculateTimeDelta(planned, actual) {
  const plannedClock = clockPart(planned);
  const actualClock = clockPart(actual);
  if (!plannedClock || !actualClock) return null;
  return clockDeltaMinutes(plannedClock, actualClock);
}

export function timingStatus(deltaMinutes, hasActual, toleranceMin = 5) {
  if (!hasActual || !Number.isFinite(deltaMinutes)) return 'missing';
  if (Math.abs(deltaMinutes) <= toleranceMin) return 'on-time';
  return deltaMinutes > 0 ? 'late' : 'early';
}

export function timingStatusLabel(status) {
  return TIMING_STATUSES.includes(status) ? status : 'missing';
}

export function buildTimingComparison(
  steps,
  liveState = {},
  { closureTime = null, toleranceMin = 5 } = {},
) {
  const list = (Array.isArray(steps) ? steps : []).filter(
    (step) => step && typeof step === 'object',
  );
  const actuals =
    liveState?.actual_timestamps && typeof liveState.actual_timestamps === 'object'
      ? liveState.actual_timestamps
      : {};
  const resolvedClosure =
    closureTime ??
    list.find((step) => step?.mandatory?.kind === 'CLOSURE')?.time ??
    null;
  const { durations } = calculateStepDurations(list, { closureTime: resolvedClosure });

  const rows = list.map((step, index) => {
    const plannedStart = clockPart(step.time ?? step.planned);
    const plannedDurationMin = Number.isFinite(durations[index]) ? durations[index] : null;
    const plannedEnd = addMinutes(plannedStart, plannedDurationMin);
    const actualRaw = actuals[step.id] ?? null;
    const actualStart = clockPart(actualRaw);
    const deltaMinutes = actualStart ? calculateTimeDelta(plannedStart, actualStart) : null;
    const status = timingStatus(deltaMinutes, Boolean(actualStart), toleranceMin);
    return {
      id: step.id ?? null,
      title: step.title ?? step.id ?? null,
      plannedStart,
      plannedEnd,
      plannedDurationMin,
      actualStart,
      actualRaw,
      actualDurationMin: null,
      actualEnd: null,
      deltaMinutes,
      status,
    };
  });

  rows.forEach((row, index) => {
    if (!row.actualStart) return;
    const nextActual = rows.slice(index + 1).find((candidate) => candidate.actualStart);
    if (nextActual) {
      const duration = clockDeltaMinutes(row.actualStart, nextActual.actualStart);
      row.actualDurationMin = Number.isFinite(duration) && duration >= 0 ? duration : null;
      row.actualEnd =
        row.actualDurationMin != null
          ? addMinutes(row.actualStart, row.actualDurationMin)
          : null;
      return;
    }
    if (index === rows.length - 1 && resolvedClosure) {
      const duration = clockDeltaMinutes(row.actualStart, resolvedClosure);
      row.actualDurationMin = Number.isFinite(duration) && duration >= 0 ? duration : null;
      row.actualEnd =
        row.actualDurationMin != null
          ? addMinutes(row.actualStart, row.actualDurationMin)
          : null;
    }
  });

  const measured = rows.filter((row) => row.actualStart);
  const summary = {
    totalSteps: rows.length,
    measured: measured.length,
    onTime: rows.filter((row) => row.status === 'on-time').length,
    late: rows.filter((row) => row.status === 'late').length,
    early: rows.filter((row) => row.status === 'early').length,
    missing: rows.filter((row) => row.status === 'missing').length,
    firstActual: measured[0]?.actualStart ?? null,
    lastActual: measured[measured.length - 1]?.actualStart ?? null,
    actualEnd:
      [...measured].reverse().find((row) => row.actualEnd)?.actualEnd ?? null,
    totalLateness: rows.reduce(
      (total, row) => total + (Number.isFinite(row.deltaMinutes) && row.deltaMinutes > 0 ? row.deltaMinutes : 0),
      0,
    ),
    totalEarly: rows.reduce(
      (total, row) => total + (Number.isFinite(row.deltaMinutes) && row.deltaMinutes < 0 ? Math.abs(row.deltaMinutes) : 0),
      0,
    ),
    toleranceMin,
  };

  return { rows, summary, closureTime: resolvedClosure };
}
