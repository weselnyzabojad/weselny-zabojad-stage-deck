// 4-digit room PIN pairing persistence.
//
// The PIN acts as the realtime room identifier (see `syncRoomKey`) and as the
// local "this device is paired" flag. It is stored in localStorage so a tablet
// that locks, reloads, or loses reception can come straight back to the deck.

const STORAGE_VERSION = 1;

export const PAIRING_STORAGE_KEY = `wzsd:v${STORAGE_VERSION}:pairing`;

export function normalizePin(value) {
  if (typeof value !== 'string') return null;
  const pin = value.trim();
  return /^\d{4}$/.test(pin) ? pin : null;
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

export function loadPairing(storage) {
  const store = getStorage(storage);
  if (!store) return null;

  try {
    const raw = store.getItem(PAIRING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const pin = normalizePin(parsed?.pin);
    if (!pin) return null;
    return {
      pin,
      pairedAt: typeof parsed?.pairedAt === 'string' ? parsed.pairedAt : null,
    };
  } catch {
    // Corrupt payload or blocked storage: treat the device as unpaired.
    return null;
  }
}

export function savePairing(pairing, storage) {
  const store = getStorage(storage);
  const pin = normalizePin(pairing?.pin);
  if (!store || !pin) return false;

  try {
    store.setItem(
      PAIRING_STORAGE_KEY,
      JSON.stringify({
        pin,
        pairedAt: typeof pairing?.pairedAt === 'string' ? pairing.pairedAt : new Date().toISOString(),
      }),
    );
    return true;
  } catch {
    // Private mode / quota exceeded: pairing stays in memory for this session.
    return false;
  }
}

export function clearPairing(storage) {
  const store = getStorage(storage);
  if (!store) return false;

  try {
    store.removeItem(PAIRING_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
