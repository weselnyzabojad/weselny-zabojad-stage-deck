// Oczepiny indicator for the MC cultural-rules bar (issue #73).
//
// The indicator has three states:
//   OFF    - the couple did not enable Oczepiny
//   ON     - Oczepiny is enabled but the block is not live
//   ACTIVE - now is inside the Oczepiny block
//
// The block starts at the `oczepiny.anchorId` hard anchor and lasts for the sum
// of the configured sub-event durations (or 60 minutes when none are configured).

import {
  clockToEventDate,
  resolveEventDateISO,
  resolveVenueTimeZone,
} from './eventTime.js';

export const DEFAULT_OCZEPINY_BLOCK_MINUTES = 60;

function validDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value : null;
}

function blockMinutesFor(oczepiny) {
  const subEvents = Array.isArray(oczepiny?.subEvents) ? oczepiny.subEvents : [];
  const total = subEvents.reduce(
    (sum, event) => sum + (Number.isFinite(event?.durationMin) ? event.durationMin : 0),
    0,
  );
  return total > 0 ? total : DEFAULT_OCZEPINY_BLOCK_MINUTES;
}

export function resolveOczepinyIndicator({
  wedding,
  now = new Date(),
  eventDateISO = null,
  timeZone = null,
} = {}) {
  const oczepiny =
    wedding?.oczepiny && typeof wedding.oczepiny === 'object' ? wedding.oczepiny : null;

  if (!oczepiny || oczepiny.enabled !== true) {
    return {
      state: 'OFF',
      label: 'OFF',
      active: false,
      enabled: false,
      anchor: null,
      window: null,
      blockMinutes: 0,
    };
  }

  const anchors = Array.isArray(wedding?.hardAnchors) ? wedding.hardAnchors : [];
  const anchor =
    anchors.find((entry) => entry?.id === oczepiny.anchorId) ??
    (Array.isArray(wedding?.steps)
      ? wedding.steps.find(
          (step) =>
            step?.optionalFlag === 'oczepiny' || /oczepiny|ocsepiny/i.test(step?.title ?? ''),
        )
      : null) ??
    null;
  const blockMinutes = blockMinutesFor(oczepiny);
  const dateISO = eventDateISO ?? resolveEventDateISO(wedding);
  const zone = timeZone ?? resolveVenueTimeZone(wedding);

  let start = null;
  if (anchor?.time && dateISO) {
    start = clockToEventDate({
      clock: anchor.time,
      eventDateISO: dateISO,
      timeZone: zone,
    });
  }
  start = validDate(start);

  let end = null;
  if (start) {
    end = new Date(start.getTime() + blockMinutes * 60 * 1000);
  }

  const nowDate = validDate(now) ?? new Date();
  const active = Boolean(start && end && nowDate >= start && nowDate < end);

  return {
    state: active ? 'ACTIVE' : 'ON',
    label: active ? 'ACTIVE' : 'ON',
    active,
    enabled: true,
    anchor,
    window: start && end ? { start, end, blockMinutes } : null,
    blockMinutes,
  };
}
