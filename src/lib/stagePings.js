// Silent stage pings are one-tap cues from the MC to the DJ Booth. They travel
// inside the synced `live_sync_state` payload as a small, sanitized object so
// the DJ device can flash a banner without exposing scripts or step controls.

export const STAGE_PINGS = {
  drop_track: {
    type: 'drop_track',
    label: 'Drop Track',
    icon: '▶️',
    banner: 'DROP TRACK NOW',
    hint: 'Start the active step track immediately.',
  },
  fade_music: {
    type: 'fade_music',
    label: 'Fade Music',
    icon: '🔉',
    banner: 'FADE MUSIC DOWN',
    hint: 'Bring the current track down under the announcement.',
  },
  hold_2m: {
    type: 'hold_2m',
    label: 'Hold 2m',
    icon: '⏳',
    banner: 'HOLD 2 MINUTES',
    hint: 'Keep the floor held for two minutes.',
  },
  ready: {
    type: 'ready',
    label: 'Ready',
    icon: '🎤',
    banner: 'READY FOR ENTRANCE',
    hint: 'MC is ready; cue the entrance track.',
  },
};

export const STAGE_PING_ORDER = ['drop_track', 'fade_music', 'hold_2m', 'ready'];

// How long the DJ banner stays on screen. Hold intentionally lingers for the
// full two minutes so the countdown is useful.
export const STAGE_PING_VISIBLE_MS = 25_000;
export const STAGE_PING_HOLD_MS = 120_000;

// Ignore pings that are older than this (e.g. a device reconnects long after
// the cue was sent) so a stale banner never fires mid-ceremony.
export const STAGE_PING_STALE_MS = 5 * 60_000;
const FUTURE_SKEW_MS = 60_000;

export function isStagePingType(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(STAGE_PINGS, value);
}

export function normalizeStagePing(raw) {
  if (!raw || typeof raw !== 'object' || !isStagePingType(raw.type)) return null;

  const sentAt = typeof raw.sent_at === 'string' ? Date.parse(raw.sent_at) : Number.NaN;
  if (!Number.isFinite(sentAt)) return null;

  const id =
    typeof raw.id === 'string' && raw.id.length > 0
      ? raw.id.slice(0, 80)
      : `${sentAt}-${raw.type}`;
  const stepId = typeof raw.step_id === 'string' && raw.step_id.length > 0 ? raw.step_id : null;

  return {
    id,
    type: raw.type,
    sent_at: new Date(sentAt).toISOString(),
    step_id: stepId,
  };
}

export function createStagePing(type, { now = new Date(), stepId = null } = {}) {
  if (!isStagePingType(type)) return null;

  const sentAt = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(sentAt.getTime())) return null;

  return {
    id: `${sentAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    sent_at: sentAt.toISOString(),
    step_id: typeof stepId === 'string' && stepId.length > 0 ? stepId : null,
  };
}

// Pure transition: keeps the rest of the live state untouched so a ping can be
// collapsed into the same debounced publish as a step advance.
export function sendStagePing(state, type, options) {
  const ping = createStagePing(type, options);
  if (!ping) return state;
  return { ...state, stage_ping: ping };
}

export function stagePingVisibleMs(type) {
  return type === 'hold_2m' ? STAGE_PING_HOLD_MS : STAGE_PING_VISIBLE_MS;
}

export function isStagePingFresh(ping, now = Date.now()) {
  const sentAt = Date.parse(ping?.sent_at ?? '');
  if (!Number.isFinite(sentAt)) return false;
  const age = now - sentAt;
  return age <= STAGE_PING_STALE_MS && age >= -FUTURE_SKEW_MS;
}
