// Stable per-device id for the append-only mutation log (P0.7).
// It is local to the device and never used as an authorization claim.

const STORAGE_KEY = 'wzsd:v1:device-id';

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createId() {
  if (globalThis.crypto?.randomUUID) return `dev_${globalThis.crypto.randomUUID()}`;
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getDeviceId(storage) {
  const store = getStorage(storage);
  if (!store) return createId();

  try {
    const existing = store.getItem(STORAGE_KEY);
    if (typeof existing === 'string' && existing.trim()) return existing.trim();
    const created = createId();
    store.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return createId();
  }
}

export { STORAGE_KEY as DEVICE_ID_STORAGE_KEY };
