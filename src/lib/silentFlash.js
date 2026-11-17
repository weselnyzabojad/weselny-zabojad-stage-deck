// Silent Flash trigger (issue #1157).
//
// The flash is driven by the schedule reschedule metadata already written by
// `applyMediaOverride` (`liveState.media_overrides.steps`). It must stay silent
// for undo entries, for any other live-state write and on the device that made
// the change. The returned descriptor is consumed by `TimelineFocusStack`'s
// `flash` prop; timings live in `flashWindow.js`.
export function buildSilentFlash(update, { deviceId = null } = {}) {
  const change = update?.change;
  if (!change || change.kind !== 'reschedule') return null;

  const at = change.at ?? update?.updatedAt ?? null;
  if (!at) return null;

  // The author device already knows: it performed the reschedule. Never match
  // an absent device id, so a missing claim cannot silence every device.
  if (deviceId && update?.deviceId === deviceId) return null;

  return { at, change };
}
