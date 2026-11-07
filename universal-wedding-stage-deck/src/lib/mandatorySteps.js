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
