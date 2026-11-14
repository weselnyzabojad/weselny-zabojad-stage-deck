import { addMinutesToClock } from './liveStageState.js';
import { calculateStepDurations } from './stepDurations.js';

export const MUSICAL_SET_EXTENSION_MIN = 60;

function clockMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function clockDeltaMinutes(from, to) {
  const fromMinutes = clockMinutes(from);
  const toMinutes = clockMinutes(to);
  if (fromMinutes == null || toMinutes == null) return null;
  let delta = toMinutes - fromMinutes;
  if (delta > 12 * 60) delta -= 24 * 60;
  if (delta < -12 * 60) delta += 24 * 60;
  return delta;
}

function before(clock, bound) {
  const delta = clockDeltaMinutes(bound, clock);
  return delta != null && delta < 0;
}

function sortByClock(steps) {
  const first = clockMinutes(steps[0]?.time);
  const afterMidnight = first != null && first >= 12 * 60;
  return steps
    .map((step, index) => ({
      step,
      index,
      time:
        clockMinutes(step.time) == null
          ? Number.MAX_SAFE_INTEGER
          : afterMidnight && clockMinutes(step.time) < 6 * 60
            ? clockMinutes(step.time) + 24 * 60
            : clockMinutes(step.time),
    }))
    .sort((a, b) => a.time - b.time || a.index - b.index)
    .map((entry) => entry.step);
}

export function extendMusicalSet(
  steps,
  activeStepId,
  { extensionAllowed = false, extensionUntil = null, closureTime = null } = {},
) {
  const list = Array.isArray(steps) ? steps : [];
  const activeIndex = list.findIndex((step) => step?.id === activeStepId);
  const active = activeIndex >= 0 ? list[activeIndex] : null;
  if (!active || active.optionalFlag !== 'dj_set') {
    return { canExtend: false, reason: 'notMusicalSet', steps: list };
  }
  if (!extensionAllowed) {
    return { canExtend: false, reason: 'notAllowed', steps: list };
  }
  if (!extensionUntil || !closureTime) {
    return { canExtend: false, reason: 'noWindow', steps: list };
  }

  const nextIndex = activeIndex + 1;
  if (nextIndex >= list.length) {
    return { canExtend: false, reason: 'noNextStep', steps: list };
  }

  let laterAnchor = null;
  for (let index = nextIndex + 1; index < list.length; index += 1) {
    if (list[index]?.type === 'HARD_ANCHOR') {
      laterAnchor = list[index];
      break;
    }
  }

  const result = list.map((step) => ({ ...step }));
  for (let index = nextIndex; index < result.length; index += 1) {
    const step = result[index];
    if (index > nextIndex && step.type === 'HARD_ANCHOR') break;
    const shifted = addMinutesToClock(step.time, MUSICAL_SET_EXTENSION_MIN);
    if (!shifted) {
      return { canExtend: false, reason: 'invalidTime', steps: list };
    }
    if (laterAnchor?.time && !before(shifted, laterAnchor.time)) {
      return { canExtend: false, reason: 'crossesAnchor', steps: list };
    }
    if (!before(shifted, closureTime)) {
      return { canExtend: false, reason: 'crossesClosure', steps: list };
    }
    if (!before(shifted, extensionUntil)) {
      return { canExtend: false, reason: 'crossesWindow', steps: list };
    }
    result[index] = { ...step, time: shifted };
  }

  const sorted = sortByClock(result);
  const beforeIds = list.map((step) => step.id).join('|');
  const afterIds = sorted.map((step) => step.id).join('|');
  if (beforeIds !== afterIds) {
    return { canExtend: false, reason: 'crossesAnchor', steps: list };
  }

  const { errors } = calculateStepDurations(sorted, { closureTime });
  if (errors.length > 0) {
    return { canExtend: false, reason: 'invalidTimeline', steps: list };
  }

  return { canExtend: true, reason: null, steps: sorted };
}
