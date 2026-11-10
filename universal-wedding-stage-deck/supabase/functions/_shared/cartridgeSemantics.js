// Server-side cartridge normalization and semantic validation (issue #165).
//
// This module is shared by the `admin_api` Edge Function. It deliberately has
// no Node/Deno-only imports so Vitest can import it directly and prove parity
// with the browser/CLI validator in `src/lib/cartridgeValidation.js`.
//
// Keep this file in sync with the browser rules. `tests/smoke/issue-165.test.js`
// compares both implementations against every schema fixture.

const DEPRECATED_TOP_LEVEL_FIELDS = [
  'jokersCount',
  'jokerGames',
  'weatherVariants',
  'coHosts',
  'contentCreators',
  'preWeddingTodos',
];
const DEPRECATED_STEP_FIELDS = ['deferable', 'weatherOption', 'cateringNotes', 'propsAndFx'];

const MINUTES_PER_DAY = 24 * 60;
const MAX_CLOCK_DELTA = MINUTES_PER_DAY / 2;

function clockToMinutes(clock) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock ?? '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function clockDeltaMinutes(fromClock, toClock) {
  const from = clockToMinutes(fromClock);
  const to = clockToMinutes(toClock);
  if (from == null || to == null) return null;

  let delta = to - from;
  if (delta > MAX_CLOCK_DELTA) delta -= MINUTES_PER_DAY;
  if (delta < -MAX_CLOCK_DELTA) delta += MINUTES_PER_DAY;
  return delta;
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Issue #75: delete, do not migrate, retired fields. The server repeats the
// browser normalization so a bypassed client cannot smuggle them into a
// published snapshot.
function migrateLegacyCouple(cartridge) {
  const legacyName = typeof cartridge.couple === 'string' ? cartridge.couple.trim() : '';
  if (!cartridge.coupleProfile && legacyName) {
    const [brideName, groomName] = legacyName.split(/\s*&\s*/);
    cartridge.coupleProfile = {
      bride: { firstName: brideName || 'Bride', nationalities: [] },
      groom: { firstName: groomName || 'Groom', nationalities: [] },
      commonLanguages: [],
    };
  }
  delete cartridge.couple;
}

function migrateMandatorySteps(cartridge) {
  const legacy = cartridge.mandatorySteps;
  if (!legacy || typeof legacy !== 'object' || !Array.isArray(cartridge.steps)) return;
  const steps = cartridge.steps;
  const findKind = (kind) => steps.find((step) => step?.mandatory?.kind === kind);
  const pushStep = (step) => steps.push({ durationMin: 1, location: '', ...step });

  if (legacy.firstGuestsArrival) {
    const step = findKind('FIRST_GUESTS_ARRIVAL');
    if (step) step.time = legacy.firstGuestsArrival;
    else pushStep({
      id: 'first_guests_arrival',
      time: legacy.firstGuestsArrival,
      title: 'First guests arrival',
      type: 'HARD_ANCHOR',
      mandatory: { kind: 'FIRST_GUESTS_ARRIVAL', label: 'First guests arrival' },
    });
  }

  for (const course of Array.isArray(legacy.kitchenServices) ? legacy.kitchenServices : []) {
    if (!course?.time) continue;
    const step = steps.find((entry) => entry.id === course.id);
    const mandatory = {
      kind: 'KITCHEN_SERVICE',
      label: course.name ?? course.id,
      serviceMode: course.serviceMode ?? 'TABLE_SERVICE',
    };
    if (step) {
      step.time = course.time;
      step.mandatory = mandatory;
      step.type = course.isHardAnchor === true ? 'HARD_ANCHOR' : step.type;
    } else {
      pushStep({
        id: course.id,
        time: course.time,
        title: course.name ?? course.id,
        type: course.isHardAnchor === true ? 'HARD_ANCHOR' : 'FLEXIBLE',
        mandatory,
      });
    }
  }

  if (legacy.cakeServiceMode) {
    const step = findKind('CAKE_SERVICE') ?? steps.find((entry) => /cake/i.test(entry.title ?? ''));
    if (step) {
      step.mandatory = {
        kind: 'CAKE_SERVICE',
        label: step.title,
        cakeServiceMode: legacy.cakeServiceMode,
      };
    }
  }

  if (legacy.closureTime) {
    const step = findKind('CLOSURE');
    const mandatory = {
      kind: 'CLOSURE',
      label: 'Wedding closure',
      ...(legacy.closureExtensionAllowed === true ? { closureExtensionAllowed: true } : {}),
      ...(legacy.closureExtensionUntil ? { closureExtensionUntil: legacy.closureExtensionUntil } : {}),
      ...(legacy.lastSong ? { lastSong: legacy.lastSong } : {}),
    };
    if (step) {
      step.time = legacy.closureTime;
      step.mandatory = mandatory;
    } else {
      pushStep({
        id: 'closure',
        time: legacy.closureTime,
        title: 'Wedding closure',
        type: 'HARD_ANCHOR',
        mandatory,
      });
    }
  }

  for (const milestone of Array.isArray(legacy.milestones) ? legacy.milestones : []) {
    if (!milestone?.id || !milestone?.time) continue;
    const existing = steps.find((entry) => entry.id === milestone.id);
    if (existing) continue;
    pushStep({
      id: milestone.id,
      time: milestone.time,
      title: milestone.label ?? milestone.id,
      type: milestone.isHardAnchor === true ? 'HARD_ANCHOR' : 'FLEXIBLE',
      mandatory: {
        kind: 'MILESTONE',
        label: milestone.label ?? milestone.id,
        milestoneKind: milestone.kind ?? 'OTHER',
        alertBeforeMin: milestone.alertBeforeMin ?? 45,
      },
    });
  }

  const firstMinutes = clockMinutes(steps[0]?.time);
  const afterMidnight = firstMinutes != null && firstMinutes >= 12 * 60;
  const sortTime = (step) => {
    const minutes = clockMinutes(step?.time);
    if (minutes == null) return Number.MAX_SAFE_INTEGER;
    return afterMidnight && minutes < 6 * 60 ? minutes + 24 * 60 : minutes;
  };
  cartridge.steps = steps
    .map((step, index) => ({ step, index }))
    .sort((a, b) => sortTime(a.step) - sortTime(b.step) || a.index - b.index)
    .map((entry) => entry.step);

  delete cartridge.mandatorySteps;
}

function migrateCeremonyGamesWishes(cartridge) {
  const steps = Array.isArray(cartridge.steps) ? cartridge.steps : [];

  if (cartridge.ceremony && typeof cartridge.ceremony === 'object') {
    const step =
      steps.find((entry) => /ceremony/i.test(entry.title ?? '')) ??
      steps.find((entry) => entry.ceremonyType);
    if (step) {
      step.ceremony = cartridge.ceremony;
      delete step.ceremonyType;
      delete step.ceremonyLocation;
    }
    delete cartridge.ceremony;
  }

  const gameLists = Array.isArray(cartridge.games?.questionLists)
    ? cartridge.games.questionLists
    : [];
  for (const list of gameLists) {
    const step =
      steps.find((entry) => entry.gameId && entry.gameId === list.id) ??
      steps.find(
        (entry) =>
          String(entry.title ?? '').trim().toLowerCase() ===
          String(list.title ?? '').trim().toLowerCase(),
      );
    if (step) {
      step.game = list;
      delete step.gameId;
      if (step.optionalFlag === 'games') delete step.optionalFlag;
    }
  }
  delete cartridge.games;

  if (cartridge.wishes) {
    for (const step of steps) {
      if (step.optionalFlag === 'wishes') delete step.optionalFlag;
    }
    delete cartridge.wishes;
  }
}

export function sanitizeCartridge(cartridge) {
  if (!cartridge || typeof cartridge !== 'object' || Array.isArray(cartridge)) {
    return cartridge;
  }

  const clean = JSON.parse(JSON.stringify(cartridge));
  migrateLegacyCouple(clean);
  delete clean.venue;
  delete clean.venueLogistics;
  delete clean.venueDetails;
  migrateCeremonyGamesWishes(clean);
  migrateMandatorySteps(clean);
  for (const field of DEPRECATED_TOP_LEVEL_FIELDS) delete clean[field];

  for (const step of Array.isArray(clean.steps) ? clean.steps : []) {
    if (!step || typeof step !== 'object') continue;
    for (const field of DEPRECATED_STEP_FIELDS) delete step[field];
  }

  if (clean.liveSyncState && typeof clean.liveSyncState === 'object') {
    delete clean.liveSyncState.deferred_step_ids;
    delete clean.liveSyncState.manual_offset_minutes;
  }

  return clean;
}

function clockMinutes(clock) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock ?? '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function isZeroDurationStep(step) {
  const kind = step?.mandatory?.kind;
  return kind === 'MILESTONE' || kind === 'CLOSURE';
}

function stepDurationErrors(steps, closureTime) {
  const errors = [];
  steps.forEach((step, index) => {
    const label = step?.id ?? `#${index + 1}`;
    const current = step?.time ?? step?.planned ?? null;
    const from = clockMinutes(current);
    if (from == null) {
      errors.push(`step ${label}: invalid or missing time`);
      return;
    }
    if (isZeroDurationStep(step)) return;

    let nextIndex = index + 1;
    while (nextIndex < steps.length && isZeroDurationStep(steps[nextIndex])) nextIndex += 1;

    if (nextIndex >= steps.length) {
      if (!closureTime) return;
      const to = clockMinutes(closureTime);
      if (to == null) {
        errors.push(`step ${label}: invalid closureTime ${closureTime}`);
        return;
      }
      const duration = to < from ? to + 1440 - from : to - from;
      if (duration > 720) {
        errors.push(`step ${label}: invalid final duration ${duration} minutes`);
      }
      return;
    }
    const next = steps[nextIndex]?.time ?? steps[nextIndex]?.planned ?? null;
    const to = clockMinutes(next);
    if (to == null) {
      errors.push(`step ${label}: next step has invalid or missing time`);
      return;
    }
    const duration = to < from ? to + 1440 - from : to - from;
    if (duration === 0) {
      errors.push(`step ${label}: duplicate time ${current} with the next step`);
    } else if (duration > 720) {
      errors.push(`step ${label}: next time ${next} is out of order or more than 720 minutes away`);
    }
  });
  return errors;
}

export function collectSemanticErrors(cartridge) {
  const errors = [];
  const pushError = (location, message) => {
    errors.push({ location, message });
  };

  const steps = Array.isArray(cartridge?.steps) ? cartridge.steps : [];
  const ids = new Set();
  const stepIds = [];

  for (const [index, step] of steps.entries()) {
    if (!step || typeof step !== 'object') continue;
    if (typeof step.id === 'string') {
      if (ids.has(step.id)) pushError(`/steps/${index}/id`, `duplicate step id "${step.id}"`);
      ids.add(step.id);
      stepIds.push(step.id);
    }
  }

  const live = cartridge?.liveSyncState;
  if (live && typeof live === 'object') {
    const known = new Set(stepIds);
    const checkRefs = (value, location) => {
      if (!Array.isArray(value)) return;
      for (const [index, id] of value.entries()) {
        if (!known.has(id)) pushError(`${location}/${index}`, `unknown step id "${id}"`);
      }
    };

    checkRefs(live.completed_step_ids, '/liveSyncState/completed_step_ids');
    checkRefs(live.step_order, '/liveSyncState/step_order');

    if (live.active_step_id != null && !known.has(live.active_step_id)) {
      pushError('/liveSyncState/active_step_id', `unknown step id "${live.active_step_id}"`);
    }
    if (live.active_step_id != null && live.completed_step_ids?.includes(live.active_step_id)) {
      pushError('/liveSyncState/active_step_id', 'active step cannot also be completed');
    }

    const pingStep = live.stage_ping?.step_id;
    if (pingStep != null && !known.has(pingStep)) {
      pushError('/liveSyncState/stage_ping/step_id', `unknown step id "${pingStep}"`);
    }

    const speechIds = new Set(
      (Array.isArray(cartridge?.speeches) ? cartridge.speeches : [])
        .map((speech) => (typeof speech?.id === 'string' ? speech.id : null))
        .filter(Boolean),
    );
    const activeSpeech = live.active_speech_id;
    if (activeSpeech != null && !speechIds.has(activeSpeech)) {
      pushError('/liveSyncState/active_speech_id', `unknown speech id "${activeSpeech}"`);
    }
  }

  const uniqueList = (items, location, label) => {
    if (!Array.isArray(items)) return;
    const seen = new Set();
    for (const [index, item] of items.entries()) {
      const id = item?.id;
      if (typeof id !== 'string') continue;
      if (seen.has(id)) pushError(`${location}/${index}/id`, `duplicate ${label} id "${id}"`);
      seen.add(id);
    }
  };

  uniqueList(cartridge?.hardAnchors, '/hardAnchors', 'hard anchor');

  // Speeches (TODO 8): ids and explicit order values must be unique. A missing
  // COMPLEX script is a warning in the product spec, not an import blocker.
  uniqueList(cartridge?.speeches, '/speeches', 'speech');
  const speechOrders = new Map();
  for (const [index, speech] of (Array.isArray(cartridge?.speeches)
    ? cartridge.speeches
    : []
  ).entries()) {
    if (!speech || !Number.isInteger(speech.order)) continue;
    if (speechOrders.has(speech.order)) {
      pushError(
        `/speeches/${index}/order`,
        `duplicate speech order ${speech.order} (also used by "${speechOrders.get(speech.order)}")`,
      );
    } else {
      speechOrders.set(speech.order, speech.id ?? `speech ${index + 1}`);
    }
  }

  // Key songs (TODO 18 / Phase 1.5d). Missing titles, artists or sources are
  // warnings in the product spec, not import blockers; only broken references
  // and unusable source shapes fail here.
  const importantSongs = cartridge?.musicPolicy?.importantSongs;
  if (Array.isArray(importantSongs)) {
    uniqueList(importantSongs, '/musicPolicy/importantSongs', 'key song');

    const validateSource = (source, location) => {
      if (!source || typeof source !== 'object' || !source.type) return;

      if (source.type === 'CUSTOMER_FILE') {
        if (typeof source.fileRef !== 'string' || source.fileRef.trim() === '') {
          pushError(`${location}/fileRef`, 'CUSTOMER_FILE requires a fileRef');
        }
        return;
      }

      for (const key of ['url', 'shortUrl']) {
        const value = source[key];
        if (value == null || value === '') continue;
        if (!isHttpUrl(value)) {
          pushError(`${location}/${key}`, `${source.type} ${key} must be a valid http(s) link`);
        }
      }
    };

    for (const [index, song] of importantSongs.entries()) {
      if (!song || typeof song !== 'object') continue;
      validateSource(song.source, `/musicPolicy/importantSongs/${index}/source`);
      validateSource(song.backupSource, `/musicPolicy/importantSongs/${index}/backupSource`);
      if (typeof song.stepId === 'string' && !stepIds.includes(song.stepId)) {
        pushError(`/musicPolicy/importantSongs/${index}/stepId`, `unknown step id "${song.stepId}"`);
      }
    }
  }

  // Cake protocol (TODO 6): the serve time cannot precede the cutting time.
  const cake = cartridge?.cake;
  if (cake && typeof cake === 'object' && cake.time && cake.serveTime) {
    const serveDelta = clockDeltaMinutes(cake.time, cake.serveTime);
    if (serveDelta != null && serveDelta < 0) {
      pushError('/cake/serveTime', 'serveTime cannot be before the cake cutting time');
    }
  }

  // Music policy (TODO 2): ids are unique and the request window is ordered.
  const mustPlay = cartridge?.musicPolicy?.mustPlay;
  if (Array.isArray(mustPlay)) {
    uniqueList(mustPlay, '/musicPolicy/mustPlay', 'must-play track');
  }
  const doNotPlay = cartridge?.musicPolicy?.doNotPlay;
  if (Array.isArray(doNotPlay)) {
    uniqueList(doNotPlay, '/musicPolicy/doNotPlay', 'do-not-play track');
  }
  const requestWindow = cartridge?.musicPolicy?.requestWindow;
  if (requestWindow?.start && requestWindow?.end) {
    const windowDelta = clockDeltaMinutes(requestWindow.start, requestWindow.end);
    if (windowDelta != null && windowDelta <= 0) {
      pushError('/musicPolicy/requestWindow/end', 'requestWindow.end must be after start');
    }
  }

  // Photographer view (TODO 21 / D2): structural refs and fire-safety rules.
  uniqueList(cartridge?.mediaTeam, '/mediaTeam', 'media team member');

  const oczepiny = cartridge?.oczepiny;
  const hasOczepinyStep = (Array.isArray(cartridge?.steps) ? cartridge.steps : []).some(
    (step) =>
      step?.optionalFlag === 'oczepiny' || /oczepiny|ocsepiny/i.test(step?.title ?? ''),
  );
  if (
    oczepiny &&
    typeof oczepiny === 'object' &&
    oczepiny.enabled === true &&
    oczepiny.order === 'MIDNIGHT' &&
    !oczepiny.anchorId &&
    !hasOczepinyStep
  ) {
    pushError(
      '/oczepiny/anchorId',
      'MIDNIGHT Oczepiny requires an anchorId or an oczepiny step',
    );
  }

  const effects = cartridge?.photoPlan?.specialEffects;
  if (effects && typeof effects === 'object' && effects.fire === true) {
    if (effects.approvals?.fire !== true) {
      pushError('/photoPlan/specialEffects/approvals/fire', 'fire effects require venue approval');
    }
  }

  const miniSession = cartridge?.photoPlan?.miniSession;
  const sunset = cartridge?.photoPlan?.sunset;
  if (miniSession?.enabled === true) {
    if (!Number.isFinite(sunset?.latitude) || !Number.isFinite(sunset?.longitude)) {
      pushError('/photoPlan/miniSession', 'mini session requires sunset latitude and longitude');
    }
  }

  const mandatoryKinds = new Map();
  steps.forEach((step, index) => {
    const kind = step?.mandatory?.kind;
    if (!kind) return;
    if (kind !== 'MILESTONE' && kind !== 'KITCHEN_SERVICE') {
      if (mandatoryKinds.has(kind)) {
        pushError(
          `/steps/${index}/mandatory/kind`,
          `duplicate mandatory ${kind} (also used by "${mandatoryKinds.get(kind)}")`,
        );
      } else {
        mandatoryKinds.set(kind, step.id ?? `step ${index + 1}`);
      }
    }
  });

  const closureStep = steps.find((step) => step?.mandatory?.kind === 'CLOSURE');
  if (closureStep?.time && closureStep.mandatory?.closureExtensionUntil) {
    const from = clockMinutes(closureStep.time);
    const to = clockMinutes(closureStep.mandatory.closureExtensionUntil);
    let delta = from == null || to == null ? null : to - from;
    if (delta != null && delta > 720) delta -= 1440;
    if (delta != null && delta < -720) delta += 1440;
    if (delta == null || delta <= 0) {
      pushError('/steps', 'closure extension must end after the closure step time');
    }
  }

  if (steps.length > 0) {
    for (const message of stepDurationErrors(steps, closureStep?.time ?? null)) {
      pushError('/steps', message);
    }
  }

  return errors;
}
