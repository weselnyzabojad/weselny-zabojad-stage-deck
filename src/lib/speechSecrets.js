// Browser-side speech secret helpers (issue #602).
//
// The cartridge carries only tokens and AES-256-GCM ciphertext. The speaker
// device imports the per-speech key as a non-exportable CryptoKey.

const TOKEN = /\{\{secret:([A-Za-z0-9_-]+)\}\}/g;

export function splitSecretTokens(text) {
  const source = String(text ?? '');
  const parts = [];
  let cursor = 0;
  for (const match of source.matchAll(TOKEN)) {
    if (match.index > cursor) parts.push({ type: 'text', value: source.slice(cursor, match.index) });
    parts.push({ type: 'secret', id: match[1] });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) parts.push({ type: 'text', value: source.slice(cursor) });
  return parts;
}

function base64UrlToBytes(value) {
  const text = String(value ?? '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = text + '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function importSpeechKey(base64UrlKey) {
  if (!base64UrlKey) throw new Error('A speech key is required.');
  return crypto.subtle.importKey(
    'raw',
    base64UrlToBytes(base64UrlKey),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
}

function aad(weddingId, speechId, redactionId, version) {
  return new TextEncoder().encode(`${weddingId}:${speechId}:${redactionId}:${version}`);
}

export async function decryptSpeechRedaction(key, { weddingId, speechId, redaction }) {
  if (!key || !redaction?.ciphertext || !redaction?.iv) return null;
  const version = Number.isInteger(redaction.keyVersion) ? redaction.keyVersion : 1;
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64UrlToBytes(redaction.iv),
      additionalData: aad(weddingId, speechId, redaction.id, version),
    },
    key,
    base64UrlToBytes(redaction.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}
