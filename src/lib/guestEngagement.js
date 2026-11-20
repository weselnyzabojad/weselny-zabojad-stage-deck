// Guest engagement heatmap model (issue #1206).
//
// Requests are bucketed on a fixed venue-time 18:00 -> 04:00 axis. The model is
// pure so the admin widget and tests can share exactly the same buckets.

import { clockToMinutes } from './clockMath.js';
import { deviceTimeZone, formatClockInZone } from './eventTime.js';
import { calculateStepDurations } from './stepDurations.js';

export const HEATMAP_START_MINUTES = 18 * 60;
export const HEATMAP_END_MINUTES = 28 * 60;
export const HEATMAP_INTERVAL_MINUTES = 15;
export const HEATMAP_BUCKET_COUNT =
  (HEATMAP_END_MINUTES - HEATMAP_START_MINUTES) / HEATMAP_INTERVAL_MINUTES;

function nightMinutes(value, timeZone) {
  const clock = formatClockInZone(value, timeZone);
  const minutes = clockToMinutes(clock);
  if (minutes == null) return null;
  return minutes < 12 * 60 ? minutes + 24 * 60 : minutes;
}

function clockNightMinutes(clock) {
  const minutes = clockToMinutes(clock);
  if (minutes == null) return null;
  return minutes < 12 * 60 ? minutes + 24 * 60 : minutes;
}

function addMinutes(clock, minutes) {
  const base = clockToMinutes(clock);
  if (base == null || !Number.isFinite(minutes)) return null;
  const total = ((base + Math.round(minutes)) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function groupRequestsByTimeSlot(
  requests,
  intervalMinutes = HEATMAP_INTERVAL_MINUTES,
  { timeZone = deviceTimeZone() } = {},
) {
  const bucketCount = Math.ceil(
    (HEATMAP_END_MINUTES - HEATMAP_START_MINUTES) / intervalMinutes,
  );
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    startMinutes: HEATMAP_START_MINUTES + index * intervalMinutes,
    endMinutes: HEATMAP_START_MINUTES + (index + 1) * intervalMinutes,
    count: 0,
  }));
  let excluded = 0;

  for (const request of Array.isArray(requests) ? requests : []) {
    const createdAt = request?.createdAt ?? request?.created_at ?? null;
    if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) {
      excluded += 1;
      continue;
    }
    const minutes = nightMinutes(createdAt, timeZone);
    if (
      minutes == null ||
      minutes < HEATMAP_START_MINUTES ||
      minutes >= HEATMAP_END_MINUTES
    ) {
      excluded += 1;
      continue;
    }
    const index = Math.floor((minutes - HEATMAP_START_MINUTES) / intervalMinutes);
    if (buckets[index]) buckets[index].count += 1;
    else excluded += 1;
  }

  return { buckets, excluded };
}

export function buildTimelineBlocks(
  steps,
  { start = HEATMAP_START_MINUTES, end = HEATMAP_END_MINUTES } = {},
) {
  const list = (Array.isArray(steps) ? steps : [])
    .map((entry) => entry?.step ?? entry)
    .filter((step) => step && typeof step === 'object');
  const closureTime =
    list.find((step) => step?.mandatory?.kind === 'CLOSURE')?.time ?? null;
  const { durations } = calculateStepDurations(list, { closureTime });
  return list
    .map((step, index) => {
      const plannedStart = step.time ?? step.plannedStart ?? null;
      const duration = Number.isFinite(durations[index]) ? durations[index] : null;
      const plannedEnd = duration != null ? addMinutes(plannedStart, duration) : null;
      const startMinutes = clockNightMinutes(plannedStart);
      const endMinutes = clockNightMinutes(plannedEnd);
      if (startMinutes == null || endMinutes == null) return null;
      if (endMinutes <= startMinutes) return null;
      return {
        id: step.id ?? null,
        title: step.title ?? step.id ?? null,
        type: step.type ?? null,
        start: plannedStart,
        end: plannedEnd,
        startMinutes: Math.max(start, startMinutes),
        endMinutes: Math.min(end, endMinutes),
      };
    })
    .filter(Boolean);
}

export function buildHeatmapModel({
  requests = [],
  steps = [],
  eventComplete = false,
  intervalMinutes = HEATMAP_INTERVAL_MINUTES,
  timeZone = deviceTimeZone(),
} = {}) {
  const { buckets, excluded } = groupRequestsByTimeSlot(requests, intervalMinutes, {
    timeZone,
  });
  const blocks = buildTimelineBlocks(steps);
  const max = buckets.reduce((value, bucket) => Math.max(value, bucket.count), 0);
  return {
    buckets,
    blocks,
    max,
    excluded,
    intervalMinutes,
    eventComplete: eventComplete === true,
  };
}
