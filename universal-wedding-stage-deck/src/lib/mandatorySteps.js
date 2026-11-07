import { firstArrivalCeremonyNote, resolveCeremony } from './ceremony.js';
import { addMinutesToClock } from './liveStageState.js';

const KITCHEN_LABELS = {
  dinner: 'Obiad weselny',
  firstSupper: 'Pierwsza kolacja',
  secondSupper: 'Druga kolacja',
  thirdSupper: 'Trzecia kolacja',
};

export const KITCHEN_SERVICE_KEYS = ['dinner', 'firstSupper', 'secondSupper', 'thirdSupper'];

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

// Normalized mandatory-constraint view shared by MC and DJ VIP. First arrival
// and kitchen/cake data stay here; prestation ready is always derived.
export function resolveMandatoryConstraints(wedding, override = null) {
  const data = resolveMandatoryData(wedding, override);
  const arrival = data.firstGuestsArrival ?? null;
  const kitchen = data.kitchenServices ?? {};
  const modes = data.kitchenServiceModes ?? {};

  return {
    firstGuestsArrival: arrival,
    prestationReady: arrival ? addMinutesToClock(arrival, -60) : null,
    kitchenServices: KITCHEN_SERVICE_KEYS.filter((key) => kitchen[key]).map((key) => ({
      key,
      label: KITCHEN_LABELS[key],
      time: kitchen[key],
      mode: modes[key] ?? 'TABLE_SERVICE',
      modeLabel: KITCHEN_SERVICE_MODE_LABELS[modes[key]] ?? KITCHEN_SERVICE_MODE_LABELS.TABLE_SERVICE,
    })),
    cakeServiceMode: data.cakeServiceMode ?? 'KITCHEN_RETURN',
    closureTime: data.closureTime ?? null,
    closureExtensionAllowed: data.closureExtensionAllowed === true,
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

  for (const key of ['dinner', 'firstSupper', 'secondSupper', 'thirdSupper']) {
    const time = data.kitchenServices?.[key];
    if (!time) continue;
    result.push({
      id: `kitchen_${key}`,
      kind: 'KITCHEN_SERVICE',
      label: KITCHEN_LABELS[key],
      time,
    });
  }
  return result;
}
