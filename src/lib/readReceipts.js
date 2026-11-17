// Read-receipt helpers shared by the acknowledgement hook and the MC badge row
// (issues #1158, #1160). Pure module: no DOM, no Supabase.

// The four badges shown to the MC. `video` belongs to the photo crew and a
// role is read as soon as any device of its group acknowledged the revision.
export const ACK_ROLE_GROUPS = Object.freeze({
  dj: Object.freeze(['dj', 'dj_mc']),
  photo: Object.freeze(['photo1', 'photo2', 'video']),
  musician: Object.freeze(['musician']),
  venue: Object.freeze(['venue_manager']),
});

const ROLE_TO_GROUP = Object.fromEntries(
  Object.entries(ACK_ROLE_GROUPS).flatMap(([group, roles]) =>
    roles.map((role) => [role, group]),
  ),
);

export function receiptRoleGroup(role) {
  return ROLE_TO_GROUP[role] ?? null;
}

// The latest reschedule target, regardless of which step it affects: the MC
// card shows "who has seen the last critical schedule change". Returns null for
// undo entries, other overrides and missing metadata.
export function latestRescheduleTarget(liveState) {
  const update = liveState?.media_overrides?.steps;
  const change = update?.change;
  if (!change || change.kind !== 'reschedule') return null;

  const stepId = typeof change.stepId === 'string' && change.stepId ? change.stepId : null;
  const revision = change.at ?? update?.updatedAt ?? null;
  if (!stepId || !revision) return null;

  return {
    stepId,
    revision,
    stepTitle: typeof change.stepTitle === 'string' ? change.stepTitle : '',
  };
}

// Single guard used by the hook: one acknowledgement per revision per device,
// only while enabled and while the screen is visible (unless the caller passes
// an explicit `visible` override for tests).
export function shouldAck({
  enabled = false,
  key = null,
  ackedKey = null,
  inFlight = false,
  visible = true,
} = {}) {
  if (!enabled || !key || !visible) return false;
  if (ackedKey === key || inFlight) return false;
  return true;
}

// Groups with at least one receipt row (first device of a group wins).
export function readReceiptGroups(receipts = []) {
  const groups = new Set();
  for (const row of Array.isArray(receipts) ? receipts : []) {
    const group = receiptRoleGroup(row?.role);
    if (group) groups.add(group);
  }
  return groups;
}

// Presence rows are raw roles; a group is online when any of its devices has an
// `online` heartbeat fresher than two minutes (the heartbeat runs every 60 s).
export const PRESENCE_FRESH_MS = 120000;

export function onlineReceiptGroups(
  presence = [],
  { now = Date.now(), freshMs = PRESENCE_FRESH_MS } = {},
) {
  const groups = new Set();
  for (const row of Array.isArray(presence) ? presence : []) {
    if (row?.status !== 'online') continue;
    const seenAt = Date.parse(row.last_seen ?? '');
    if (!Number.isFinite(seenAt) || now - seenAt > freshMs) continue;
    const group = receiptRoleGroup(row.role);
    if (group) groups.add(group);
  }
  return groups;
}
