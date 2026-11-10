// Cross-field checks for WeddingSchema v1.1 that JSON Schema cannot express.
// Shared by the Node CLI validator and the browser importer so both enforce
// the same rules.

import { isHttpUrl } from './importantSongs.js';
import { clockDeltaMinutes } from './clockMath.js';

import { calculateStepDurations } from './stepDurations.js';

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
  for (const [index, speech] of (Array.isArray(cartridge?.speeches) ? cartridge.speeches : []).entries()) {
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

  // Witnesses are key persons linked to their speeches by stable id. Contact
  // details are admin-only and are never a stage-role concern here.
  uniqueList(cartridge?.witnesses, '/witnesses', 'witness');
  const allSpeechIds = new Set(
    (Array.isArray(cartridge?.speeches) ? cartridge.speeches : [])
      .map((speech) => (typeof speech?.id === 'string' ? speech.id : null))
      .filter(Boolean),
  );
  for (const [index, witness] of (Array.isArray(cartridge?.witnesses)
    ? cartridge.witnesses
    : []
  ).entries()) {
    for (const [speechIndex, speechId] of (Array.isArray(witness?.speechIds)
      ? witness.speechIds
      : []
    ).entries()) {
      if (!allSpeechIds.has(speechId)) {
        pushError(
          `/witnesses/${index}/speechIds/${speechIndex}`,
          `unknown speech id "${speechId}"`,
        );
      }
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
    if (effects.permitRequired !== true) {
      pushError('/photoPlan/specialEffects/permitRequired', 'fire effects require a permit requirement');
    }
    if (effects.venueApproved !== true) {
      pushError('/photoPlan/specialEffects/venueApproved', 'fire effects require venue approval');
    }
    if (typeof effects.safetyBriefing !== 'string' || effects.safetyBriefing.trim() === '') {
      pushError('/photoPlan/specialEffects/safetyBriefing', 'fire effects require a safety briefing');
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
  for (const [index, step] of steps.entries()) {
    const kind = step?.mandatory?.kind;
    if (!kind) continue;
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
  }

  const closureStep = steps.find((step) => step?.mandatory?.kind === 'CLOSURE');
  if (closureStep?.time && closureStep.mandatory?.closureExtensionUntil) {
    const extensionDelta = clockDeltaMinutes(
      closureStep.time,
      closureStep.mandatory.closureExtensionUntil,
    );
    if (extensionDelta == null || extensionDelta <= 0) {
      pushError(
        '/steps',
        'closure extension must end after the closure step time',
      );
    }
  }

  if (steps.length > 0) {
    const durations = calculateStepDurations(steps, {
      closureTime: closureStep?.time ?? null,
    });
    for (const message of durations.errors) {
      pushError('/steps', message);
    }
  }

  return errors;
}
