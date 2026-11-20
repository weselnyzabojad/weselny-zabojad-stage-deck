// Per-device theme helpers (TODO 27).
//
// Theme is a device preference stored under `wzsd:v1:theme`; it is never part
// of the synced live state, so the MC tablet can stay on Night Stage while the
// Pocket phone runs Daylight. Dark values equal the original palette.

export const THEME_STORAGE_KEY = 'wzsd:v1:theme';
export const THEMES = {
  NIGHT: 'night',
  DAY: 'day',
};
export const THEME_COLORS = {
  night: '#070b19',
  day: '#eef2f7',
};

export function normalizeTheme(value) {
  return value === THEMES.DAY ? THEMES.DAY : value === THEMES.NIGHT ? THEMES.NIGHT : null;
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

export function readStoredTheme(storage) {
  const store = getStorage(storage);
  if (!store) return null;

  try {
    const raw = store.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    return normalizeTheme(JSON.parse(raw)?.theme);
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme, storage) {
  const store = getStorage(storage);
  const normalized = normalizeTheme(theme);
  if (!store || !normalized) return false;

  try {
    store.setItem(THEME_STORAGE_KEY, JSON.stringify({ theme: normalized }));
    return true;
  } catch {
    return false;
  }
}

// Explicit stored choice wins; otherwise follow the OS setting.
export function resolveInitialTheme({ storedTheme = null, prefersLight = false } = {}) {
  return normalizeTheme(storedTheme) ?? (prefersLight ? THEMES.DAY : THEMES.NIGHT);
}

export function applyThemeToDocument(theme, documentRef) {
  const doc = documentRef ?? (typeof document !== 'undefined' ? document : null);
  if (!doc?.documentElement) return;

  const normalized = normalizeTheme(theme) ?? THEMES.NIGHT;
  doc.documentElement.dataset.theme = normalized;
  doc.documentElement.style.colorScheme = normalized === THEMES.DAY ? 'light' : 'dark';

  const meta = doc.querySelector?.('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[normalized]);
}

export function prefersLightScheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  } catch {
    return false;
  }
}
