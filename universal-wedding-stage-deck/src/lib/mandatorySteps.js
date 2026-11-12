import { firstArrivalCeremonyNote, resolveCeremony } from './ceremony.js';
import { addMinutesToClock } from './liveStageState.js';

export const KITCHEN_SERVICE_MODE_LABELS = {
  TABLE_SERVICE: 'Table service',
  BUFFET: 'Buffet',
};

function orderedSteps(wedding, override = null) {
  if (Array.isArray(override)) return override.filter(Boolean);
  if (Array.isArray(override?.value)) return override.value.filter(Boolean);
  return Array.isArray(wedding?.steps) ? wedding.steps.filter(Boolean) : [];
}

function mandatoryOf(step) {
  return step?.mandatory && typeof step.mandatory === 'object' ? step.mandatory : null;
}

function kitchenCourses(steps) {
  return steps
    .filter((step) => mandatoryOf(step)?.kind === 'KITCHEN_SERVICE')
    .map((step) => ({
      id: step.id,
      name: mandatoryOf(step).label ?? step.title,
      time: step.time,
      serviceMode: mandatoryOf(step).serviceMode ?? 'TABLE_SERVICE',
      isHardAnchor: step.type === 'HARD_ANCHOR',
    }));
}

// Normalized mandatory-constraint view shared by MC and DJ VIP. First arrival,
// kitchen and cake data live on their own steps; prestation ready is derived.
export function resolveMandatoryConstraints(wedding, override = null) {
  const steps = orderedSteps(wedding, override);
  const arrivalStep = steps.find(
    (step) => mandatoryOf(step)?.kind === 'FIRST_GUESTS_ARRIVAL',
  );
  const cakeStep = steps.find((step) => mandatoryOf(step)?.kind === 'CAKE_SERVICE');
  const closureStep = steps.find((step) => mandatoryOf(step)?.kind === 'CLOSURE');
  const arrival = arrivalStep?.time ?? null;
  const closure = mandatoryOf(closureStep) ?? null;

  return {
    firstGuestsArrival: arrival,
    prestationReady: arrival ? addMinutesToClock(arrival, -60) : null,
    kitchenServices: kitchenCourses(steps).map((course) => {
      const mode = course.serviceMode ?? 'TABLE_SERVICE';
      return {
        key: course.id,
        label: course.name ?? course.id,
        time: course.time,
        mode,
        modeLabel: KITCHEN_SERVICE_MODE_LABELS[mode] ?? KITCHEN_SERVICE_MODE_LABELS.TABLE_SERVICE,
      };
    }),
    cakeServiceMode: mandatoryOf(cakeStep)?.cakeServiceMode ?? 'KITCHEN_RETURN',
    closureTime: closureStep?.time ?? null,
    closureExtensionAllowed: closure?.closureExtensionAllowed === true,
    closureExtensionUntil: closure?.closureExtensionUntil ?? null,
    lastSong: closure?.lastSong ?? null,
  };
}

// Embed mandatory data into the step cards where it belongs. MC sees the full
// set; DJ VIP only sees the first-arrival milestone. DJ Standard and other
// roles get nothing.
export function mapMandatoryToSteps(
  wedding,
  steps = [],
  { role = 'mc', isVipDj = false } = {},
) {
  const byStep = {};
  const isMc = role === 'mc';
  const isDjVip = role === 'dj' && isVipDj;
  if (!isMc && !isDjVip) return byStep;

  const ordered = (Array.isArray(steps) ? steps : []).filter(Boolean);
  if (ordered.length === 0) return byStep;

  const add = (step, item) => {
    if (!step?.id) return;
    byStep[step.id] = byStep[step.id] ?? [];
    byStep[step.id].push(item);
  };
  for (const step of ordered) {
    const mandatory = mandatoryOf(step);
    if (!mandatory) continue;

    if (!isMc) continue;

    if (mandatory.kind === 'KITCHEN_SERVICE') {
      add(step, {
        kind: 'kitchenService',
        key: step.id,
        label: mandatory.label ?? step.title,
        time: step.time,
        mode: mandatory.serviceMode ?? 'TABLE_SERVICE',
      });
    }

    if (mandatory.kind === 'CAKE_SERVICE' && mandatory.cakeServiceMode) {
      add(step, { kind: 'cakeServiceMode', mode: mandatory.cakeServiceMode });
    }
  }

  if (isMc) {
    const ceremonyNote = firstArrivalCeremonyNote(resolveCeremony(wedding));
    if (ceremonyNote) {
      const ceremonyStep =
        ordered.find((step) => /ceremony/i.test(step.title ?? '')) ?? ordered[0];
      add(ceremonyStep, { kind: 'ceremonyNote', text: ceremonyNote });
    }
  }

  return byStep;
}

// Mandatory milestones as a flat list for admin/legacy consumers.
export function buildMandatorySteps(wedding) {
  const steps = orderedSteps(wedding);
  const result = [];
  const arrivalStep = steps.find(
    (step) => mandatoryOf(step)?.kind === 'FIRST_GUESTS_ARRIVAL',
  );
  if (arrivalStep?.time) {
    result.push({
      id: 'prep_ready',
      kind: 'PREP_READY',
      label: 'Prestation ready',
      time: addMinutesToClock(arrivalStep.time, -60),
      derivedFrom: 'firstGuestsArrival',
    });
    result.push({
      id: 'first_guests_arrival',
      kind: 'FIRST_GUESTS_ARRIVAL',
      label: 'First guests arrival',
      time: arrivalStep.time,
    });
  }

  for (const course of kitchenCourses(steps)) {
    result.push({
      id: `kitchen_${course.id}`,
      kind: 'KITCHEN_SERVICE',
      label: course.name ?? course.id,
      time: course.time,
    });
  }
  return result;
}

// Venue Manager adapter: project step metadata into the flat editor model.
export function settingsFromSteps(steps = []) {
  const settings = {
    firstGuestsArrival: null,
    kitchenServices: [],
    milestones: [],
    cakeServiceMode: 'KITCHEN_RETURN',
    closureTime: null,
    closureExtensionAllowed: false,
    closureExtensionUntil: null,
    lastSong: null,
  };

  for (const step of Array.isArray(steps) ? steps : []) {
    const mandatory = mandatoryOf(step);
    if (!mandatory) continue;
    if (mandatory.kind === 'FIRST_GUESTS_ARRIVAL') {
      settings.firstGuestsArrival = step.time ?? null;
    } else if (mandatory.kind === 'KITCHEN_SERVICE') {
      settings.kitchenServices.push({
        id: step.id,
        name: mandatory.label ?? step.title,
        time: step.time,
        serviceMode: mandatory.serviceMode ?? 'TABLE_SERVICE',
        isHardAnchor: step.type === 'HARD_ANCHOR',
      });
    } else if (mandatory.kind === 'MILESTONE') {
      settings.milestones.push({
        id: step.id,
        label: mandatory.label ?? step.title,
        time: step.time,
        kind: mandatory.milestoneKind ?? 'OTHER',
        alertBeforeMin: mandatory.alertBeforeMin ?? 45,
        isHardAnchor: step.type === 'HARD_ANCHOR',
      });
    } else if (mandatory.kind === 'CAKE_SERVICE') {
      settings.cakeServiceMode = mandatory.cakeServiceMode ?? 'KITCHEN_RETURN';
    } else if (mandatory.kind === 'CLOSURE') {
      settings.closureTime = step.time ?? null;
      settings.closureExtensionAllowed = mandatory.closureExtensionAllowed === true;
      settings.closureExtensionUntil = mandatory.closureExtensionUntil ?? null;
      settings.lastSong = mandatory.lastSong ?? null;
    }
  }

  return settings;
}

function makeStep({ id, time, title, type = 'HARD_ANCHOR', mandatory }) {
  return {
    id,
    time,
    durationMin: 1,
    title: title || id,
    type,
    location: '',
    mandatory,
  };
}

// Venue Manager adapter: write the flat editor model back onto timeline steps.
// The step time is the only clock value; no parallel mandatory object is kept.
export function applyMandatorySettings(wedding, settings = {}) {
  const steps = (Array.isArray(wedding?.steps) ? wedding.steps : []).map((step) => {
    const copy = { ...step };
    if (mandatoryOf(step)) copy.mandatory = { ...mandatoryOf(step) };
    return copy;
  });
  const findKind = (kind) => steps.find((step) => mandatoryOf(step)?.kind === kind);
  const findId = (id) => steps.find((step) => step.id === id);

  const arrival = findKind('FIRST_GUESTS_ARRIVAL');
  if (settings.firstGuestsArrival) {
    if (arrival) {
      arrival.time = settings.firstGuestsArrival;
      arrival.mandatory.label ??= 'First guests arrival';
    } else {
      steps.push(
        makeStep({
          id: 'first_guests_arrival',
          time: settings.firstGuestsArrival,
          title: 'First guests arrival',
          mandatory: { kind: 'FIRST_GUESTS_ARRIVAL', label: 'First guests arrival' },
        }),
      );
    }
  }

  const courses = Array.isArray(settings.kitchenServices) ? settings.kitchenServices : [];
  const courseIds = new Set(courses.map((course) => course.id));
  for (const step of [...steps]) {
    if (
      mandatoryOf(step)?.kind === 'KITCHEN_SERVICE' &&
      !courseIds.has(step.id)
    ) {
      steps.splice(steps.indexOf(step), 1);
    }
  }
  for (const course of courses) {
    const step = findId(course.id);
    const mandatory = {
      kind: 'KITCHEN_SERVICE',
      label: course.name || course.id,
      serviceMode: course.serviceMode ?? 'TABLE_SERVICE',
    };
    if (step) {
      step.time = course.time ?? step.time;
      step.title = course.name || step.title;
      step.mandatory = mandatory;
      step.type = 'HARD_ANCHOR';
    } else if (course.time) {
      steps.push(
        makeStep({
          id: course.id,
          time: course.time,
          title: course.name || course.id,
          type: 'HARD_ANCHOR',
          mandatory,
        }),
      );
    }
  }

  const milestones = Array.isArray(settings.milestones) ? settings.milestones : [];
  const milestoneIds = new Set(milestones.map((milestone) => milestone.id));
  for (const step of [...steps]) {
    if (mandatoryOf(step)?.kind === 'MILESTONE' && !milestoneIds.has(step.id)) {
      steps.splice(steps.indexOf(step), 1);
    }
  }
  for (const milestone of milestones) {
    const step = findId(milestone.id);
    const mandatory = {
      kind: 'MILESTONE',
      label: milestone.label || milestone.id,
      milestoneKind: milestone.kind ?? 'OTHER',
      alertBeforeMin: Number.isFinite(milestone.alertBeforeMin)
        ? milestone.alertBeforeMin
        : 45,
    };
    if (step) {
      step.time = milestone.time ?? step.time;
      step.title = milestone.label || step.title;
      step.mandatory = mandatory;
      step.type = milestone.isHardAnchor === true ? 'HARD_ANCHOR' : 'FLEXIBLE';
    } else if (milestone.time) {
      steps.push(
        makeStep({
          id: milestone.id,
          time: milestone.time,
          title: milestone.label || milestone.id,
          type: milestone.isHardAnchor === true ? 'HARD_ANCHOR' : 'FLEXIBLE',
          mandatory,
        }),
      );
    }
  }

  const cakeStep =
    findKind('CAKE_SERVICE') ?? steps.find((step) => /cake/i.test(step.title ?? ''));
  if (cakeStep) {
    cakeStep.mandatory = {
      ...(mandatoryOf(cakeStep) ?? {}),
      kind: 'CAKE_SERVICE',
      label: mandatoryOf(cakeStep)?.label ?? cakeStep.title,
      cakeServiceMode: settings.cakeServiceMode ?? 'KITCHEN_RETURN',
    };
  }

  const closure = findKind('CLOSURE');
  if (settings.closureTime) {
    const mandatory = {
      kind: 'CLOSURE',
      label: 'Wedding closure',
      closureExtensionAllowed: settings.closureExtensionAllowed === true,
      ...(settings.closureExtensionUntil
        ? { closureExtensionUntil: settings.closureExtensionUntil }
        : {}),
      ...(settings.lastSong ? { lastSong: settings.lastSong } : {}),
    };
    if (closure) {
      closure.time = settings.closureTime;
      closure.mandatory = mandatory;
    } else {
      steps.push(
        makeStep({
          id: 'closure',
          time: settings.closureTime,
          title: 'Wedding closure',
          mandatory,
        }),
      );
    }
  }

  return sortStepsByClock(steps.filter(Boolean));
}

function clockMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function sortStepsByClock(steps) {
  const firstMinutes = clockMinutes(steps[0]?.time);
  const afterMidnight = firstMinutes != null && firstMinutes >= 12 * 60;
  return steps
    .map((step, index) => {
      const minutes = clockMinutes(step.time);
      return {
        step,
        index,
        sortTime:
          minutes == null
            ? Number.MAX_SAFE_INTEGER
            : afterMidnight && minutes < 6 * 60
              ? minutes + 24 * 60
              : minutes,
      };
    })
    .sort((a, b) => a.sortTime - b.sortTime || a.index - b.index)
    .map((entry) => entry.step);
}
