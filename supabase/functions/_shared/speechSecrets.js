// Speech key derivation plus the legacy per-redaction decryptor used only by
// the one-time migration (issue #929). New speech content is encrypted as a
// whole script by speechBundle.js; no marker parser or token renderer remains.
//
// The shared derivation and AES envelope live in bundleCrypto.js so game
// question bundles (#931) reuse the same master-key mechanism.

import {
  base64UrlToBytes,
  bytesToBase64Url,
  deriveScopedKeyBytes,
  BUNDLE_KEY_VERSION,
} from './bundleCrypto.js';

const ALG = 'AES-256-GCM';
const KEY_VERSION = BUNDLE_KEY_VERSION;

export { bytesToBase64Url, base64UrlToBytes };

export async function deriveSpeechKeyBytes(
  masterKey,
  weddingId,
  speechId,
  version = KEY_VERSION,
) {
  return deriveScopedKeyBytes({
    masterKey,
    weddingId,
    scope: 'speech',
    id: speechId,
    version,
    secretName: 'SPEECH_SECRET_MASTER_KEY',
  });
}

async function aesKey(masterKey, weddingId, speechId, version) {
  const raw = await deriveSpeechKeyBytes(masterKey, weddingId, speechId, version);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function aad(weddingId, speechId, redactionId, version) {
  return new TextEncoder().encode(`${weddingId}:${speechId}:${redactionId}:${version}`);
}

// Legacy migration only: decrypts an old script.redactions entry so its
// plaintext can be merged into the new whole-script ciphertext.
export async function decryptSecret({
  masterKey,
  weddingId,
  speechId,
  redaction,
}) {
  const version = Number.isInteger(redaction?.keyVersion) ? redaction.keyVersion : KEY_VERSION;
  const key = await aesKey(masterKey, weddingId, speechId, version);
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

export { ALG as LEGACY_SECRET_ALG };
