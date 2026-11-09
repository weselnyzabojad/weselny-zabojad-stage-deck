import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  decryptSecret,
  encryptSecret,
  parseSecretMarkers,
} from '../../supabase/functions/_shared/speechSecrets.js';
import {
  decryptSpeechRedaction,
  importSpeechKey,
  splitSecretTokens,
} from '../../src/lib/speechSecrets.js';
import { bytesToBase64Url, deriveSpeechKeyBytes } from '../../supabase/functions/_shared/speechSecrets.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
const masterKey = 'test-master-key-32-bytes-long';

describe('issue #602 encrypted speech redactions', () => {
  it('turns markers into tokens and encrypts the value', async () => {
    const parsed = parseSecretMarkers('Call {{secret}}Anna Kowalska{{/secret}} before the toast.');
    expect(parsed.text).toBe('Call {{secret:r1}} before the toast.');
    expect(parsed.secrets).toEqual([{ id: 'r1', plaintext: 'Anna Kowalska' }]);

    const redaction = await encryptSecret({
      masterKey,
      weddingId: 'w1',
      speechId: 's1',
      redactionId: 'r1',
      plaintext: 'Anna Kowalska',
    });
    expect(redaction.ciphertext).not.toContain('Anna');
    const plaintext = await decryptSecret({
      masterKey,
      weddingId: 'w1',
      speechId: 's1',
      redaction,
    });
    expect(plaintext).toBe('Anna Kowalska');
  });

  it('rejects the wrong speech context', async () => {
    const redaction = await encryptSecret({
      masterKey,
      weddingId: 'w1',
      speechId: 's1',
      redactionId: 'r1',
      plaintext: 'secret',
    });
    await expect(
      decryptSecret({ masterKey, weddingId: 'w1', speechId: 's2', redaction }),
    ).rejects.toThrow();
  });

  it('decrypts in the browser with the delivered key', async () => {
    const redaction = await encryptSecret({
      masterKey,
      weddingId: 'w1',
      speechId: 's1',
      redactionId: 'r1',
      plaintext: 'Anna',
    });
    const raw = await deriveSpeechKeyBytes(masterKey, 'w1', 's1', 1);
    const key = await importSpeechKey(bytesToBase64Url(raw));
    const plaintext = await decryptSpeechRedaction(key, {
      weddingId: 'w1',
      speechId: 's1',
      redaction,
    });
    expect(plaintext).toBe('Anna');
  });

  it('splits tokens for the speaker renderer', () => {
    expect(splitSecretTokens('Call {{secret:r1}} now')).toEqual([
      { type: 'text', value: 'Call ' },
      { type: 'secret', id: 'r1' },
      { type: 'text', value: ' now' },
    ]);
  });

  it('declares redactions in the schema and wires the views', () => {
    const script = json('schema/domains/speeches.json').$defs.speech.properties.script;
    expect(script.properties.redactions.items.$ref).toBe('#/$defs/redaction');
    expect(json('schema/domains/speeches.json').$defs.redaction.properties.alg.enum).toEqual([
      'AES-256-GCM',
    ]);
    expect(read('src/components/SpeakerView.jsx')).toContain('SecretScript');
    expect(read('src/admin/AdminSpeechesPanel.jsx')).toContain('redactions');
    expect(read('supabase/functions/reveal_speech_key/index.ts')).toContain(
      "payload.app_role !== 'speaker'",
    );
  });
});
