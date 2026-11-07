// Server-side cartridge normalization and semantic validation (issue #165).
//
// This module is shared by the `admin_api` Edge Function. It deliberately has
// no Node/Deno-only imports so Vitest can import it directly and prove parity
// with the browser/CLI validator in `src/lib/cartridgeValidation.js`.
//
// Keep this file in sync with the browser rules. `tests/smoke/issue-165.test.js`
// compares both implementations against every schema fixture.

const DEPRECATED_TOP_LEVEL_FIELDS = ['jokersCount', 'jokerGames', 'weatherVariants'];
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
export function sanitizeCartridge(cartridge) {
  if (!cartridge || typeof cartridge !== 'object' || Array.isArray(cartridge)) {
    return cartridge;
  }

  const clean = JSON.parse(JSON.stringify(cartridge));
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

// D4: never store plaintext VIP alerts or contacts in a published cartridge.
// The MC device uploads the encrypted bundle separately to `sensitive_notes`.
export function redactSensitive(cartridge) {
  const copy = { ...cartridge };
  delete copy.vipAlerts;
  delete copy.tact_and_vip_alerts;
  delete copy.contacts;
  return copy;
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
  uniqueList(cartridge?.tact_and_vip_alerts, '/tact_and_vip_alerts', 'VIP alert');
  uniqueList(cartridge?.contacts, '/contacts', 'contact');

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
  if (
    oczepiny &&
    typeof oczepiny === 'object' &&
    oczepiny.enabled === true &&
    oczepiny.order === 'MIDNIGHT' &&
    !oczepiny.anchorId
  ) {
    pushError('/oczepiny/anchorId', 'MIDNIGHT Oczepiny requires an anchorId');
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

  if (
    Number.isInteger(cartridge?.vipRadarCount) &&
    Array.isArray(cartridge?.tact_and_vip_alerts) &&
    cartridge.vipRadarCount !== cartridge.tact_and_vip_alerts.length
  ) {
    pushError(
      '/vipRadarCount',
      `vipRadarCount ${cartridge.vipRadarCount} does not match tact_and_vip_alerts.length ${cartridge.tact_and_vip_alerts.length}`,
    );
  }

  for (const [index, step] of steps.entries()) {
    const buffer = step?.buffer;
    if (!buffer || typeof buffer !== 'object') continue;
    if (
      Number.isFinite(buffer.minDurationMin) &&
      Number.isFinite(buffer.maxDurationMin) &&
      buffer.minDurationMin > buffer.maxDurationMin
    ) {
      pushError(`/steps/${index}/buffer`, 'minDurationMin cannot exceed maxDurationMin');
    }
    if (
      Number.isFinite(step.durationMin) &&
      Number.isFinite(buffer.minDurationMin) &&
      step.durationMin < buffer.minDurationMin
    ) {
      pushError(`/steps/${index}/durationMin`, 'durationMin is below buffer.minDurationMin');
    }
    if (
      Number.isFinite(step.durationMin) &&
      Number.isFinite(buffer.maxDurationMin) &&
      step.durationMin > buffer.maxDurationMin
    ) {
      pushError(`/steps/${index}/durationMin`, 'durationMin is above buffer.maxDurationMin');
    }
  }

  return errors;
}
