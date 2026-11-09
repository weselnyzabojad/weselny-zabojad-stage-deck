import { firstArrivalCeremonyNote, resolveCeremony } from './ceremony.js';
import { addMinutesToClock } from './liveStageState.js';

export const KITCHEN_SERVICE_MODE_LABELS = {
  TABLE_SERVICE: 'Table service',
  BUFFET: 'Buffet',
};

function resolveMandatoryData(wedding, override) {
  if (override && typeof override === 'object') {
    if (override.value && typeof override.value === 'object') return override.value;
    return override;
  }
  return wedding?.mandatorySteps ?? {};
}

// `kitchenServices` is an ordered array of `{ id, name, time, serviceMode }`.
function normalizeKitchenServices(value) {
  return Array.isArray(value)
    ? value.filter((course) => course && course.time).map((course) => ({
        id: course.id ?? 'course',
        name: course.name,
        time: course.time,
        serviceMode: course.serviceMode,
      }))
    : [];
}

// Normalized mandatory-constraint view shared by MC and DJ VIP. First arrival
// and kitchen/cake data stay here; prestation ready is always derived.
export function resolveMandatoryConstraints(wedding, override = null) {
  const data = resolveMandatoryData(wedding, override);
  const arrival = data.firstGuestsArrival ?? null;
  const kitchenServices = normalizeKitchenServices(data.kitchenServices);

  return {
    firstGuestsArrival: arrival,
    prestationReady: arrival ? addMinutesToClock(arrival, -60) : null,
    kitchenServices: kitchenServices.map((course) => {
      const mode = course.serviceMode ?? 'TABLE_SERVICE';
      return {
        key: course.id,
        label: course.name ?? course.id,
        time: course.time,
        mode,
        modeLabel: KITCHEN_SERVICE_MODE_LABELS[mode] ?? KITCHEN_SERVICE_MODE_LABELS.TABLE_SERVICE,
      };
    }),
    cakeServiceMode: data.cakeServiceMode ?? 'KITCHEN_RETURN',
    closureTime: data.closureTime ?? null,
    closureExtensionAllowed: data.closureExtensionAllowed === true,
    closureExtensionUntil: data.closureExtensionUntil ?? null,
    lastSong: data.lastSong ?? null,
  };
}

function clockMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function findStepForClock(steps, clock) {
  const target = clockMinutes(clock);
  if (target == null) return steps[0] ?? null;
  let candidate = steps[0] ?? null;
  let candidateMinutes = -1;
  for (const step of steps) {
    const minutes = clockMinutes(step?.time);
    if (minutes == null) continue;
    if (minutes <= target && minutes >= candidateMinutes) {
      candidate = step;
      candidateMinutes = minutes;
    }
  }
  return candidate;
}

// Embed mandatory data into the step cards where it belongs. MC sees the full
// set; DJ VIP only sees the first-arrival milestone. DJ Standard and other
// roles get nothing.
export function mapMandatoryToSteps(
  wedding,
  steps = [],
  { role = 'mc', isVipDj = false, override = null } = {},
) {
  const byStep = {};
  const isMc = role === 'mc';
  const isDjVip = role === 'dj' && isVipDj;
  if (!isMc && !isDjVip) return byStep;

  const ordered = (Array.isArray(steps) ? steps : []).filter(Boolean);
  if (ordered.length === 0) return byStep;
  const firstStep = ordered[0];
  const constraints = resolveMandatoryConstraints(wedding, override);

  const add = (step, item) => {
    if (!step?.id) return;
    byStep[step.id] = byStep[step.id] ?? [];
    byStep[step.id].push(item);
  };

  if (constraints.firstGuestsArrival) {
    add(firstStep, { kind: 'firstArrival', time: constraints.firstGuestsArrival });
  }

  if (!isMc) return byStep;

  if (constraints.prestationReady) {
    add(firstStep, { kind: 'prestationReady', time: constraints.prestationReady });
  }

  for (const service of constraints.kitchenServices) {
    const step = findStepForClock(ordered, service.time);
    if (step) {
      add(step, {
        kind: 'kitchenService',
        key: service.key,
        label: service.label,
        time: service.time,
        mode: service.mode,
      });
    }
  }

  const cakeStep = ordered.find((step) => /cake/i.test(step.title ?? ''));
  if (cakeStep && constraints.cakeServiceMode) {
    add(cakeStep, { kind: 'cakeServiceMode', mode: constraints.cakeServiceMode });
  }

  const ceremonyNote = firstArrivalCeremonyNote(resolveCeremony(wedding));
  if (ceremonyNote) {
    const ceremonyStep =
      ordered.find((step) => /ceremony/i.test(step.title ?? '')) ?? firstStep;
    add(ceremonyStep, { kind: 'ceremonyNote', text: ceremonyNote });
  }

  return byStep;
}

// Mandatory milestones are exact-hour obligations, separate from timeline steps.
export function buildMandatorySteps(wedding) {
  const data = wedding?.mandatorySteps;
  if (!data || typeof data !== 'object') return [];

  const result = [];
  const arrival = data.firstGuestsArrival;
  if (arrival) {
    result.push({
      id: 'prep_ready',
      kind: 'PREP_READY',
      label: 'Prestation ready',
      time: addMinutesToClock(arrival, -60),
      derivedFrom: 'firstGuestsArrival',
    });
    result.push({
      id: 'first_guests_arrival',
      kind: 'FIRST_GUESTS_ARRIVAL',
      label: 'First guests arrival',
      time: arrival,
    });
  }

  for (const course of normalizeKitchenServices(data.kitchenServices)) {
    result.push({
      id: `kitchen_${course.id}`,
      kind: 'KITCHEN_SERVICE',
      label: course.name ?? course.id,
      time: course.time,
    });
  }
  return result;
}
