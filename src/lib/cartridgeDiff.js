// Non-destructive cartridge diff for the admin Drive publish flow (issue #170).
// Compares stable ids and surfaces whether the live step/speech would disappear.

function itemsById(items) {
  const byId = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (item && typeof item.id === 'string') byId.set(item.id, item);
  }
  return byId;
}

function compareLists(currentItems, nextItems) {
  const current = itemsById(currentItems);
  const next = itemsById(nextItems);
  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, item] of next) {
    if (!current.has(id)) added.push(id);
    else if (JSON.stringify(current.get(id)) !== JSON.stringify(item)) {
      changed.push(id);
    }
  }
  for (const id of current.keys()) {
    if (!next.has(id)) removed.push(id);
  }
  return { added, removed, changed };
}

function changedKeys(current, next, keys) {
  const changes = [];
  for (const key of keys) {
    if (JSON.stringify(current?.[key] ?? null) !== JSON.stringify(next?.[key] ?? null)) {
      changes.push(key);
    }
  }
  return changes;
}

export function diffCartridges(current, next, liveState = null) {
  const currentCartridge = current && typeof current === 'object' ? current : {};
  const nextCartridge = next && typeof next === 'object' ? next : {};

  const identity = changedKeys(currentCartridge, nextCartridge, [
    'schemaVersion',
    'weddingId',
    'coupleProfile',
    'date',
    'syncPin',
    'servicePackage',
    'servicePackage',
  ]);
  const steps = compareLists(currentCartridge.steps, nextCartridge.steps);
  const speeches = compareLists(currentCartridge.speeches, nextCartridge.speeches);

  const currentVisibility = currentCartridge.viewVisibility ?? {};
  const nextVisibility = nextCartridge.viewVisibility ?? {};
  const roleVisibility = [
    ...new Set([...Object.keys(currentVisibility), ...Object.keys(nextVisibility)]),
  ].filter(
    (role) =>
      JSON.stringify(currentVisibility[role] ?? null) !==
      JSON.stringify(nextVisibility[role] ?? null),
  );

  const activeStepId = liveState?.active_step_id ?? null;
  const activeSpeechId = liveState?.active_speech_id ?? null;
  const nextStepIds = new Set(
    (Array.isArray(nextCartridge.steps) ? nextCartridge.steps : [])
      .map((step) => step?.id)
      .filter(Boolean),
  );
  const nextSpeechIds = new Set(
    (Array.isArray(nextCartridge.speeches) ? nextCartridge.speeches : [])
      .map((speech) => speech?.id)
      .filter(Boolean),
  );

  const impact = {
    activeStepId,
    activeStepRemoved: Boolean(activeStepId && !nextStepIds.has(activeStepId)),
    activeSpeechId,
    activeSpeechRemoved: Boolean(activeSpeechId && !nextSpeechIds.has(activeSpeechId)),
  };

  const hasChanges =
    identity.length > 0 ||
    roleVisibility.length > 0 ||
    steps.added.length > 0 ||
    steps.removed.length > 0 ||
    steps.changed.length > 0 ||
    speeches.added.length > 0 ||
    speeches.removed.length > 0 ||
    speeches.changed.length > 0;

  return { hasChanges, identity, steps, speeches, roleVisibility, impact };
}
