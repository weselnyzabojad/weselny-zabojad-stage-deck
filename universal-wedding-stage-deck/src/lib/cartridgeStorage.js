// Persistence for an imported wedding cartridge. Imported cartridges replace
// the built-in demo until cleared.

const STORAGE_VERSION = 1;

export const CARTRIDGE_STORAGE_KEY = `wzsd:v${STORAGE_VERSION}:cartridge`;

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isCartridgeLike(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      value.schemaVersion === '1.1' &&
      typeof value.weddingId === 'string' &&
      value.weddingId.length > 0 &&
      typeof value.couple === 'string' &&
      typeof value.syncPin === 'string' &&
      /^\d{4}$/.test(value.syncPin) &&
      Array.isArray(value.steps) &&
      value.steps.length > 0,
  );
}

export function loadActiveCartridge(storage) {
  const store = getStorage(storage);
  if (!store) return null;

  try {
    const raw = store.getItem(CARTRIDGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isCartridgeLike(parsed) ? parsed : null;
  } catch {
    // Corrupt or blocked storage: fall back to the built-in demo.
    return null;
  }
}

export function saveActiveCartridge(cartridge, storage) {
  const store = getStorage(storage);
  if (!store || !isCartridgeLike(cartridge)) return false;

  try {
    store.setItem(CARTRIDGE_STORAGE_KEY, JSON.stringify(cartridge));
    return true;
  } catch {
    return false;
  }
}

export function clearActiveCartridge(storage) {
  const store = getStorage(storage);
  if (!store) return false;

  try {
    store.removeItem(CARTRIDGE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
