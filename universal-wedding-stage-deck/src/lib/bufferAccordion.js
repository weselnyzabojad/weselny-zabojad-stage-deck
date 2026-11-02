// BUFFER accordion logic.
//
// A BUFFER step can declare a flexible duration range:
//
//   buffer: { minDurationMin: 10, maxDurationMin: 60, danceBlock: true }
//
// When the show is late the engine recommends shaving those buffers down;
// when it is ahead it recommends extending them so the kitchen / next fixed
// anchor is not hit early. If the flex is exhausted while ahead, it prompts for
// a Joker Game. Applying the recommended durations is left to issue #13.

import { addMinutesToClock } from './liveStageState.js';

export function getBufferFlex(step) {
  if (!step || step.type !== 'BUFFER') return null;

  const plannedDurationMin = Number(step.durationMin);
  if (!Number.isFinite(plannedDurationMin) || plannedDurationMin < 0) return null;

  const config = step.buffer;
  if (!config || typeof config !== 'object') return null;

  const minRaw =
    typeof config.minDurationMin === 'number' ? config.minDurationMin : Number.NaN;
  const maxRaw =
    typeof config.maxDurationMin === 'number' ? config.maxDurationMin : Number.NaN;

  const minDurationMin = Number.isFinite(minRaw)
    ? Math.min(Math.max(0, minRaw), plannedDurationMin)
    : plannedDurationMin;
  const maxDurationMin = Number.isFinite(maxRaw)
    ? Math.max(maxRaw, plannedDurationMin)
    : plannedDurationMin;

  if (minDurationMin === plannedDurationMin && maxDurationMin === plannedDurationMin) {
    return null;
  }

  return {
    plannedDurationMin,
    minDurationMin,
    maxDurationMin,
    canShortenMinutes: plannedDurationMin - minDurationMin,
    canExtendMinutes: maxDurationMin - plannedDurationMin,
    isDanceBlock: config.danceBlock === true,
  };
}

function formatNames(items) {
  if (items.length === 0) return 'buffers';
  if (items.length === 1) return items[0].title;
  if (items.length === 2) return `${items[0].title} and ${items[1].title}`;
  return `${items[0].title} +${items.length - 1} more`;
}

function buildItem(entry, flex, action, adjustedDurationMin, deltaMinutes) {
  return {
    stepId: entry.step.id,
    title: entry.step.title,
    isDanceBlock: flex.isDanceBlock,
    action,
    plannedDurationMin: flex.plannedDurationMin,
    adjustedDurationMin,
    deltaMinutes,
    minDurationMin: flex.minDurationMin,
    maxDurationMin: flex.maxDurationMin,
    capacityMinutes:
      action === 'shorten' ? flex.canShortenMinutes : flex.canExtendMinutes,
    projectedStart: entry.projectedStart,
    projectedEndBeforeAdjustment: entry.projectedEnd,
    projectedEndAfterAdjustment: addMinutesToClock(entry.projectedStart, adjustedDurationMin),
  };
}

export function buildBufferAccordion(
  entries = [],
  driftMinutes = null,
  { jokerAvailable = true } = {},
) {
  const candidates = entries
    .filter((entry) => !entry.isDone && entry.step?.type === 'BUFFER')
    .map((entry) => ({ entry, flex: getBufferFlex(entry.step) }))
    .filter((candidate) => candidate.flex);

  const totalShortenAvailableMinutes = candidates.reduce(
    (total, candidate) => total + candidate.flex.canShortenMinutes,
    0,
  );
  const totalExtendAvailableMinutes = candidates.reduce(
    (total, candidate) => total + candidate.flex.canExtendMinutes,
    0,
  );

  const base = {
    driftMinutes,
    mode: 'none',
    status: 'ontime',
    message: 'On schedule — buffers can stay as planned.',
    items: [],
    durationByStepId: {},
    hasChanges: false,
    recoveredMinutes: 0,
    remainingMinutes: 0,
    suggestJoker: false,
    jokerAvailable,
    totalShortenAvailableMinutes,
    totalExtendAvailableMinutes,
  };

  if (candidates.length === 0) {
    return {
      ...base,
      status: 'unavailable',
      message: 'No flexible BUFFER blocks are left in this schedule.',
    };
  }

  if (!Number.isFinite(driftMinutes)) {
    return {
      ...base,
      status: 'unknown',
      message: 'Drift unavailable — keeping planned buffer lengths.',
    };
  }

  if (driftMinutes === 0) return base;

  if (driftMinutes > 0) {
    let remaining = driftMinutes;
    const items = [];
    const durationByStepId = {};

    for (const { entry, flex } of candidates) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, flex.canShortenMinutes);
      if (take <= 0) continue;

      const adjustedDurationMin = flex.plannedDurationMin - take;
      remaining -= take;
      items.push(buildItem(entry, flex, 'shorten', adjustedDurationMin, -take));
      durationByStepId[entry.step.id] = adjustedDurationMin;
    }

    const recoveredMinutes = driftMinutes - remaining;
    const names = formatNames(items);
    const status = recoveredMinutes > 0 ? 'shorten' : 'blocked';
    const message =
      recoveredMinutes > 0 && remaining === 0
        ? `Shorten ${names} by ${recoveredMinutes}m to recover the ${driftMinutes}m delay.`
        : recoveredMinutes > 0
          ? `Shorten ${names} by ${recoveredMinutes}m; ${remaining}m still late — protect the next fixed anchor.`
          : `No flexible buffer left — ${driftMinutes}m late remains.`;

    return {
      ...base,
      mode: 'late',
      status,
      message,
      items,
      durationByStepId,
      hasChanges: items.length > 0,
      recoveredMinutes,
      remainingMinutes: remaining,
    };
  }

  const lead = Math.abs(driftMinutes);
  let remaining = lead;
  const items = [];
  const durationByStepId = {};

  for (const { entry, flex } of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, flex.canExtendMinutes);
    if (take <= 0) continue;

    const adjustedDurationMin = flex.plannedDurationMin + take;
    remaining -= take;
    items.push(buildItem(entry, flex, 'extend', adjustedDurationMin, take));
    durationByStepId[entry.step.id] = adjustedDurationMin;
  }

  const recoveredMinutes = lead - remaining;
  const suggestJoker = remaining > 0 && jokerAvailable;
  const names = formatNames(items);
  const status =
    recoveredMinutes > 0
      ? suggestJoker
        ? 'extend-and-joker'
        : 'extend'
      : suggestJoker
        ? 'joker'
        : 'blocked';
  const message =
    recoveredMinutes > 0 && remaining === 0
      ? `Extend ${names} by ${recoveredMinutes}m to absorb the ${lead}m lead.`
      : recoveredMinutes > 0
        ? jokerAvailable
          ? `Extend ${names} by ${recoveredMinutes}m; still ${remaining}m ahead — pull a Joker Game from the drawer.`
          : `Extend ${names} by ${recoveredMinutes}m; still ${remaining}m ahead and no Joker is available.`
        : jokerAvailable
          ? `Running ${lead}m ahead — pull a Joker Game from the drawer.`
          : `Running ${lead}m ahead — no flexible buffer or Joker is available.`;

  return {
    ...base,
    mode: 'ahead',
    status,
    message,
    items,
    durationByStepId,
    hasChanges: items.length > 0,
    recoveredMinutes,
    remainingMinutes: remaining,
    suggestJoker,
  };
}
