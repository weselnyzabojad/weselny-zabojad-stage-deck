import { addMinutesToClock } from './liveStageState.js';

const KITCHEN_LABELS = {
  dinner: 'Obiad weselny',
  firstSupper: 'Pierwsza kolacja',
  secondSupper: 'Druga kolacja',
  thirdSupper: 'Trzecia kolacja',
};

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
