// Issue #923: whole-script speech bundle encryption.
// The plaintext never leaves the server; each speech has its own HKDF-derived
// AES-256-GCM key and revision/version-bound additional data. The shared
// envelope is in bundleCrypto.js so game bundles reuse it (#931).

import {
  decryptScopedBundle,
  encryptScopedBundle,
  BUNDLE_ALG,
  BUNDLE_KEY_VERSION,
} from './bundleCrypto.js';

const MARKER = /\{\{secret\}\}([\s\S]*?)\{\{\/secret\}\}/g;
const TOKEN = /\{\{secret:[A-Za-z0-9_-]+\}\}/g;

export function stripSecretMarkers(value) {
  return String(value ?? '')
    .replace(MARKER, (_match, plaintext) => plaintext)
    .replace(TOKEN, '');
}

export async function encryptSpeechScript({
  masterKey,
  weddingId,
  speechId,
  revision,
  plaintext,
  version = BUNDLE_KEY_VERSION,
}) {
  return encryptScopedBundle({
    masterKey,
    weddingId,
    scope: 'speech',
    id: speechId,
    revision,
    plaintext: stripSecretMarkers(plaintext),
    version,
    secretName: 'SPEECH_SECRET_MASTER_KEY',
    aadPrefix: '',
  });
}

export async function decryptSpeechScript({
  masterKey,
  weddingId,
  speechId,
  revision,
  entry,
}) {
  return decryptScopedBundle({
    masterKey,
    weddingId,
    scope: 'speech',
    id: speechId,
    revision,
    entry,
    secretName: 'SPEECH_SECRET_MASTER_KEY',
    aadPrefix: '',
  });
}

export { BUNDLE_ALG as SPEECH_BUNDLE_ALG, BUNDLE_KEY_VERSION as SPEECH_BUNDLE_KEY_VERSION };
