// Local display-PIN gate (D7).
//
// The 4-digit DDMM PIN only unlocks this device's UI; it is NOT the cloud room
// identity. The room key is `wzsd:<weddingId>` (see `syncRoomKey`). The pairing
// record is bound to a specific `weddingId` so two cartridges that share the
// same DDMM PIN can never inherit each other's paired state.

const STORAGE_VERSION = 1;

export const PAIRING_STORAGE_KEY = `wzsd:v${STORAGE_VERSION}:pairing`;

export function normalizePin(value) {
  if (typeof value !== 'string') return null;
  const pin = value.trim();
  return /^\d{4}$/.test(pin) ? pin : null;
}

function normalizeWeddingId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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

export function pairingMatches(pairing, { pin, weddingId } = {}) {
  const candidatePin = normalizePin(pin);
  const candidateWedding = normalizeWeddingId(weddingId);
  return Boolean(
    pairing &&
      candidatePin &&
      candidateWedding &&
      pairing.pin === candidatePin &&
      pairing.weddingId === candidateWedding,
  );
}

export function loadPairing(storage) {
  const store = getStorage(storage);
  if (!store) return null;

  try {
    const raw = store.getItem(PAIRING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const pin = normalizePin(parsed?.pin);
    const weddingId = normalizeWeddingId(parsed?.weddingId);
    // Legacy records without a weddingId are not trusted: re-enter the PIN so a
    // shared DDMM PIN cannot carry over from another cartridge.
    if (!pin || !weddingId) return null;
    return {
      pin,
      weddingId,
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
  const weddingId = normalizeWeddingId(pairing?.weddingId);
  if (!store || !pin || !weddingId) return false;

  try {
    store.setItem(
      PAIRING_STORAGE_KEY,
      JSON.stringify({
        pin,
        weddingId,
        pairedAt: typeof pairing?.pairedAt === 'string' ? pairing.pairedAt : new Date().toISOString(),
      }),
    );
    return true;
  } catch {
    // Private mode / quota exceeded: pairing stays in memory for this session.
    return false;
  }
}
