// Issue #1323: Venue Manager approval for the CAKE and KITCHEN hard anchors.
// Approval is runtime live-state metadata, never a Doc value. It is bound to the
// exact anchor time, so a re-import or venue override that changes the time
// makes the stored approval read as PENDING again.

export const ANCHOR_APPROVAL_STATUSES = Object.freeze([
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export function isApprovableAnchor(step) {
  const kind = step?.mandatory?.kind;
  return kind === 'CAKE_SERVICE' || kind === 'KITCHEN_SERVICE';
}

function cleanReason(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function pendingAnchorApproval(anchor) {
  return {
    anchorId: anchor?.id ?? null,
    anchorLabel: anchor?.title ?? anchor?.id ?? '',
    status: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    approvedValue: anchor?.time ?? null,
    reason: null,
  };
}

export function anchorApprovalFor(approvals, anchor) {
  const entry = approvals?.[anchor?.id];
  if (
    entry &&
    ANCHOR_APPROVAL_STATUSES.includes(entry.status) &&
    entry.status !== 'PENDING' &&
    entry.approvedValue === anchor?.time
  ) {
    return {
      ...pendingAnchorApproval(anchor),
      ...entry,
      anchorId: anchor.id,
      anchorLabel: anchor.title ?? anchor.id,
    };
  }
  return pendingAnchorApproval(anchor);
}

export function decideAnchorApproval({
  status,
  anchor,
  actor = {},
  reason = null,
  now = new Date(),
} = {}) {
  if (!isApprovableAnchor(anchor)) {
    throw new Error('Only CAKE and KITCHEN anchors can be approved.');
  }
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new Error('Anchor decision must be APPROVED or REJECTED.');
  }
  const at = now instanceof Date && Number.isFinite(now.getTime())
    ? now.toISOString()
    : new Date().toISOString();
  return {
    anchorId: anchor.id,
    anchorLabel: anchor.title ?? anchor.id,
    status,
    approvedBy: actor?.deviceId ?? actor?.role ?? 'venue_manager',
    approvedAt: at,
    approvedValue: anchor.time,
    reason: cleanReason(reason),
  };
}
