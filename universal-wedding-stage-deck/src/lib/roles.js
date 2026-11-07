// Device roles for the stage deck. The role is a per-device UI choice stored in
// localStorage; it is never part of the synced live-state payload, so a tablet
// can stay on MC Master while another device follows the same room in the DJ,
// Photographer or Speaker view.
//
// Role separation is currently a UX boundary, not an auth boundary: every
// paired device uses the same room PIN. Split role PINs are tracked separately.
//
// The Pocket role was removed (issue #109): unknown or legacy `pocket` values
// normalize to `mc`, so a previously paired device is not stranded.

import { t } from '../i18n/index.js';

const STORAGE_VERSION = 1;

export const ROLE_STORAGE_KEY = `wzsd:v${STORAGE_VERSION}:role`;

export const ROLES = {
  mc: {
    id: 'mc',
    label: 'MC Master',
    short: 'MC',
    icon: '🎤',
    blurb: 'Scripts, drift controls, VIP radar and full timeline.',
  },
  dj: {
    id: 'dj',
    label: 'DJ Booth',
    short: 'DJ',
    icon: '🎧',
    blurb: 'Read-only timeline, playlists and hard cutoffs.',
  },
  photo1: {
    id: 'photo1',
    label: 'Photographer 1',
    short: 'Photo 1',
    icon: '📷',
    blurb: 'Media step timeline, shot plan and light windows.',
  },
  photo2: {
    id: 'photo2',
    label: 'Photographer 2',
    short: 'Photo 2',
    icon: '📷',
    blurb: 'Media step timeline, shot plan and light windows.',
  },
  video: {
    id: 'video',
    label: 'Cameraman',
    short: 'Camera',
    icon: '🎥',
    blurb: 'Media step timeline, shot plan and light windows.',
  },
  // Legacy single-photographer role, kept for old stored values and tokens.
  photo: {
    id: 'photo',
    label: 'Photographer',
    short: 'Photo',
    icon: '📷',
    blurb: 'Media step timeline, shot plan and light windows.',
  },
  speaker: {
    id: 'speaker',
    label: 'Speaker',
    short: 'Speaker',
    icon: '🗣️',
    blurb: 'Read-only script teleprompter for the assigned speech.',
  },
};

export const MEDIA_ROLE_IDS = ['photo1', 'photo2', 'video'];
export const ROLE_ORDER = ['mc', 'dj', 'photo1', 'photo2', 'video', 'speaker'];

export function isMediaRole(value) {
  return MEDIA_ROLE_IDS.includes(value);
}

export function normalizeRole(value) {
  if (value === 'photo') return 'photo1';
  return typeof value === 'string' && ROLES[value] ? value : 'mc';
}

// Localized role labels for the current device UI language (issue #78). The
// `ROLES` object keeps the canonical ids/icons; these helpers resolve display
// text so every role view follows the language toggle.
export function roleLabel(id) {
  const key = ROLES[id] ? id : 'mc';
  return t(`role.${key}.label`);
}

export function roleShort(id) {
  const key = ROLES[id] ? id : 'mc';
  return t(`role.${key}.short`);
}

export function roleBlurb(id) {
  const key = ROLES[id] ? id : 'mc';
  return t(`role.${key}.blurb`);
}

// HOST_ONLY weddings have no DJ booth: hide that role from the switcher.
// `photo` is a separate device role (D2) and is never hidden by the package.
export function availableRoleIds(hostingMode) {
  if (hostingMode === 'HOST_ONLY') return ROLE_ORDER.filter((id) => id !== 'dj');
  return ROLE_ORDER;
}

// Only MC Master may switch views; companion roles are locked to their own view.
export function roleOptionsFor(role, roles = ROLE_ORDER) {
  return role === 'mc' ? roles : [];
}

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadRole(storage) {
  const store = getStorage(storage);
  if (!store) return 'mc';

  try {
    const raw = store.getItem(ROLE_STORAGE_KEY);
    if (!raw) return 'mc';
    const parsed = JSON.parse(raw);
    return normalizeRole(parsed?.role);
  } catch {
    // Corrupt payload or blocked storage: fall back to the full MC view.
    return 'mc';
  }
}

export function saveRole(role, storage) {
  const store = getStorage(storage);
  const next = normalizeRole(role);
  if (!store) return false;

  try {
    store.setItem(ROLE_STORAGE_KEY, JSON.stringify({ role: next }));
    return true;
  } catch {
    return false;
  }
}

export function clearRole(storage) {
  const store = getStorage(storage);
  if (!store) return false;

  try {
    store.removeItem(ROLE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
