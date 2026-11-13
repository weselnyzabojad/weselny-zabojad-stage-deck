// Free HaveIBeenPwned Pwned Passwords check using k-anonymity.
// Only the first five SHA-1 hex characters are sent to the API.

const HIBP_RANGE_ENDPOINT = 'https://api.pwnedpasswords.com/range/';
const HIBP_TIMEOUT_MS = 4000;
const HIBP_USER_AGENT = 'WeselnyZabojadStageDeck/1.0';

export async function checkPasswordBreach(password, { fetchImpl = fetch } = {}) {
  if (typeof password !== 'string' || password.length === 0) {
    return { ok: false, error: 'A password is required.' };
  }

  const digest = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(password),
  );
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await fetchImpl(`${HIBP_RANGE_ENDPOINT}${prefix}`, {
      headers: {
        'Add-Padding': 'true',
        'User-Agent': HIBP_USER_AGENT,
      },
      signal: AbortSignal.timeout(HIBP_TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, unavailable: true };
    const text = await response.text();
    const breached = text.split('\n').some((line) => {
      const [candidate, count] = line.trim().split(':');
      return candidate === suffix && Number(count) > 0;
    });
    return { ok: true, breached };
  } catch {
    return { ok: false, unavailable: true };
  }
}
