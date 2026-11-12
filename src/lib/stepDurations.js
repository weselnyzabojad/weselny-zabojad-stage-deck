import { clockToMinutes } from './clockMath.js';

const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_FINAL_DURATION_MIN = 15;
const DEFAULT_MAX_DURATION_MIN = 720;

function stepClock(step) {
  return step?.time ?? step?.planned ?? null;
}

function isZeroDurationStep(step) {
  const kind = step?.mandatory?.kind;
  return kind === 'MILESTONE' || kind === 'CLOSURE';
}

function durationBetween(fromClock, toClock) {
  const from = clockToMinutes(fromClock);
  const to = clockToMinutes(toClock);
  if (from == null || to == null) return null;
  const raw = to - from;
  return raw < 0 ? raw + MINUTES_PER_DAY : raw;
}

// Step durations come from the next step's Google Doc time. The final step runs
// to the closure time when provided, otherwise the configured final duration.
export function calculateStepDurations(
  steps,
  { finalDurationMin = DEFAULT_FINAL_DURATION_MIN, closureTime = null, maxDurationMin = DEFAULT_MAX_DURATION_MIN } = {},
) {
  const list = Array.isArray(steps) ? steps : [];
  const durations = [];
  const errors = [];

  list.forEach((step, index) => {
    const label = step?.id ?? `#${index + 1}`;
    const current = stepClock(step);
    if (clockToMinutes(current) == null) {
      errors.push(`step ${label}: invalid or missing time`);
      durations[index] = null;
      return;
    }

    if (isZeroDurationStep(step)) {
      durations[index] = 0;
      return;
    }

    let nextIndex = index + 1;
    while (nextIndex < list.length && isZeroDurationStep(list[nextIndex])) nextIndex += 1;

    const isFinal = nextIndex >= list.length;
    if (isFinal) {
      if (!closureTime) {
        durations[index] = finalDurationMin;
        return;
      }
      const finalDuration = durationBetween(current, closureTime);
      if (finalDuration == null) {
        errors.push(`step ${label}: invalid closureTime ${closureTime}`);
        durations[index] = null;
        return;
      }
      if (finalDuration > maxDurationMin) {
        errors.push(`step ${label}: invalid final duration ${finalDuration} minutes`);
        durations[index] = null;
        return;
      }
      durations[index] = finalDuration;
      return;
    }

    const next = stepClock(list[nextIndex]);
    if (clockToMinutes(next) == null) {
      errors.push(`step ${label}: next step has invalid or missing time`);
      durations[index] = null;
      return;
    }

    const duration = durationBetween(current, next);
    if (duration === 0) {
      errors.push(`step ${label}: duplicate time ${current} with the next step`);
      durations[index] = null;
      return;
    }
    if (duration > maxDurationMin) {
      errors.push(`step ${label}: next time ${next} is out of order or more than ${maxDurationMin} minutes away`);
      durations[index] = null;
      return;
    }
    durations[index] = duration;
  });

  return { durations, errors };
}

export function applyCalculatedDurations(steps, options) {
  const result = calculateStepDurations(steps, options);
  if (result.errors.length > 0) return result;
  const list = Array.isArray(steps) ? steps : [];
  const withDurations = list.map((step, index) => ({
    ...step,
    durationMin: result.durations[index],
  }));
  return { ...result, steps: withDurations };
}
