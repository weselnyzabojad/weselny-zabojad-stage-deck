import { describe, expect, it } from 'vitest';
import {
  decryptSpeechScript,
  encryptSpeechScript,
  stripSecretMarkers,
} from '../supabase/functions/_shared/speechBundle.js';

const base = {
  masterKey: 'local-32-byte-random-value-000000',
  weddingId: '2026-08-20_test',
  speechId: 'speech_witness',
  revision: 3,
};

describe('issue #923 speech bundle encryption', () => {
  it('drops secret markers while preserving the script text', () => {
    expect(stripSecretMarkers('Hello {{secret}}secret{{/secret}} world')).toBe(
      'Hello secret world',
    );
    expect(stripSecretMarkers('Hello {{secret:r1}} world')).toBe('Hello  world');
  });

  it('round-trips a whole script with revision-bound AES-GCM', async () => {
    const entry = await encryptSpeechScript({ ...base, plaintext: 'Drodzy Państwo…' });
    expect(entry.alg).toBe('AES-256-GCM');
    expect(entry.ciphertext).not.toContain('Drodzy');
    expect(entry.revision).toBe(3);
    await expect(decryptSpeechScript({ ...base, entry })).resolves.toBe('Drodzy Państwo…');
  });

  it('fails when the revision or speech does not match', async () => {
    const entry = await encryptSpeechScript({ ...base, plaintext: 'Secret' });
    await expect(
      decryptSpeechScript({ ...base, revision: 4, entry }),
    ).rejects.toBeTruthy();
    await expect(
      decryptSpeechScript({ ...base, speechId: 'other', entry }),
    ).rejects.toBeTruthy();
  });
});
