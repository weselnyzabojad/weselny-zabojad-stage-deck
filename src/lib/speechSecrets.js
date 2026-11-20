// Browser-side speech key import (issues #602, #926).
//
// The dedicated speech bundle delivers a per-speech key; the device imports it
// as a non-exportable CryptoKey and decrypts whole scripts locally.

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
