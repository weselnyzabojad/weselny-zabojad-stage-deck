// Cross-field checks for WeddingSchema v1.1 that JSON Schema cannot express.
// Shared by the Node CLI validator and the browser importer so both enforce
// the same rules.

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
    checkRefs(live.deferred_step_ids, '/liveSyncState/deferred_step_ids');
    checkRefs(live.step_order, '/liveSyncState/step_order');

    if (live.active_step_id != null && !known.has(live.active_step_id)) {
      pushError('/liveSyncState/active_step_id', `unknown step id "${live.active_step_id}"`);
    }
    if (live.active_step_id != null && live.completed_step_ids?.includes(live.active_step_id)) {
      pushError('/liveSyncState/active_step_id', 'active step cannot also be completed');
    }
    if (live.active_step_id != null && live.deferred_step_ids?.includes(live.active_step_id)) {
      pushError('/liveSyncState/active_step_id', 'active step cannot also be deferred');
    }
    for (const [index, id] of (live.deferred_step_ids ?? []).entries()) {
      if (live.completed_step_ids?.includes(id)) {
        pushError(`/liveSyncState/deferred_step_ids/${index}`, 'deferred step cannot be completed');
      }
    }

    const pingStep = live.stage_ping?.step_id;
    if (pingStep != null && !known.has(pingStep)) {
      pushError('/liveSyncState/stage_ping/step_id', `unknown step id "${pingStep}"`);
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
  uniqueList(cartridge?.jokerGames, '/jokerGames', 'joker');

  if (
    Number.isInteger(cartridge?.jokersCount) &&
    Array.isArray(cartridge?.jokerGames) &&
    cartridge.jokersCount !== cartridge.jokerGames.length
  ) {
    pushError(
      '/jokersCount',
      `jokersCount ${cartridge.jokersCount} does not match jokerGames.length ${cartridge.jokerGames.length}`,
    );
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
