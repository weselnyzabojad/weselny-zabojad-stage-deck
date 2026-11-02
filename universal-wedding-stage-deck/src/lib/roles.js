// Device roles for the stage deck. The role is a per-device UI choice stored in
// localStorage; it is never part of the synced live-state payload, so a tablet
// can stay on MC Master while a phone follows the same room in Pocket Remote.
//
// Role separation is currently a UX boundary, not an auth boundary: every
// paired device uses the same room PIN. Split role PINs are tracked separately.

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
  pocket: {
    id: 'pocket',
    label: 'Pocket Remote',
    short: 'Pocket',
    icon: '📱',
    blurb: 'Compact advance and drift check for walking segments.',
  },
};

export const ROLE_ORDER = ['mc', 'dj', 'pocket'];

export function normalizeRole(value) {
  return typeof value === 'string' && ROLES[value] ? value : 'mc';
}

// HOST_ONLY weddings have no DJ booth: hide that role from the switcher.
export function availableRoleIds(hostingMode) {
  if (hostingMode === 'HOST_ONLY') return ROLE_ORDER.filter((id) => id !== 'dj');
  return ROLE_ORDER;
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
