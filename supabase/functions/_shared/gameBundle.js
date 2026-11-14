// Issue #931: one immutable encrypted question bundle per wedding and game
// type. The whole question array is serialized and encrypted with a game-scoped
// key derived from the existing master secret. The MC receives ciphertext plus
// the key; plaintext never leaves the server except in the AAL2 admin preview.

import {
  decryptScopedBundle,
  deriveScopedKeyBytes,
  encryptScopedBundle,
  BUNDLE_ALG,
  BUNDLE_KEY_VERSION,
} from './bundleCrypto.js';

const SECRET_NAME = 'SPEECH_SECRET_MASTER_KEY';

export async function deriveGameKeyBytes({
  masterKey,
  weddingId,
  gameType,
  version = BUNDLE_KEY_VERSION,
}) {
  return deriveScopedKeyBytes({
    masterKey,
    weddingId,
    scope: 'game',
    id: gameType,
    version,
    secretName: SECRET_NAME,
  });
}

export async function encryptGameBundle({
  masterKey,
  weddingId,
  gameType,
  revision,
  questions,
  version = BUNDLE_KEY_VERSION,
}) {
  return encryptScopedBundle({
    masterKey,
    weddingId,
    scope: 'game',
    id: gameType,
    revision,
    plaintext: JSON.stringify(Array.isArray(questions) ? questions : []),
    version,
    secretName: SECRET_NAME,
  });
}

export async function decryptGameBundle({
  masterKey,
  weddingId,
  gameType,
  revision,
  entry,
}) {
  const plaintext = await decryptScopedBundle({
    masterKey,
    weddingId,
    scope: 'game',
    id: gameType,
    revision,
    entry,
    secretName: SECRET_NAME,
  });
  const questions = JSON.parse(plaintext);
  return Array.isArray(questions) ? questions : [];
}

export { BUNDLE_ALG as GAME_BUNDLE_ALG, BUNDLE_KEY_VERSION as GAME_BUNDLE_KEY_VERSION };
