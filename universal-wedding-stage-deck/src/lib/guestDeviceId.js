export const GUEST_DEVICE_ID_KEY = 'wedding_guest_device_id';

function fallbackUuid(cryptoImpl) {
  const bytes = new Uint8Array(16);
  if (typeof cryptoImpl?.getRandomValues === 'function') {
    cryptoImpl.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createGuestDeviceId(cryptoImpl = globalThis.crypto) {
  if (typeof cryptoImpl?.randomUUID === 'function') {
    try {
      return cryptoImpl.randomUUID();
    } catch {
      // Fall through to the manual v4 generator.
    }
  }
  return fallbackUuid(cryptoImpl);
}

// Correlation id only, never authentication. Reused for every request from this
// browser so the guest can restore and follow their own request status.
export function getGuestDeviceId({
  storage = typeof window === 'undefined' ? null : window.localStorage,
  cryptoImpl = globalThis.crypto,
} = {}) {
  try {
    const existing = storage?.getItem(GUEST_DEVICE_ID_KEY);
    if (typeof existing === 'string' && existing.trim()) return existing.trim();
  } catch {
    // Storage can be blocked; keep a session-only id instead.
  }

  const id = createGuestDeviceId(cryptoImpl);
  try {
    storage?.setItem(GUEST_DEVICE_ID_KEY, id);
  } catch {
    // Ignore quota/privacy-mode failures.
  }
  return id;
}
