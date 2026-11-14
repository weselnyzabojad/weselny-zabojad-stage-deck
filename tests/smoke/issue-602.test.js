import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as sharedSecrets from '../../supabase/functions/_shared/speechSecrets.js';
import * as browserSecrets from '../../src/lib/speechSecrets.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #929 legacy redaction removal', () => {
  it('keeps only key derivation and the migration decryptor', () => {
    expect(typeof sharedSecrets.deriveSpeechKeyBytes).toBe('function');
    expect(typeof sharedSecrets.decryptSecret).toBe('function');
    for (const name of ['parseSecretMarkers', 'encryptSecret', 'listSecretTokens']) {
      expect(sharedSecrets[name]).toBeUndefined();
    }
    expect(typeof browserSecrets.importSpeechKey).toBe('function');
    for (const name of ['splitSecretTokens', 'decryptSpeechRedaction']) {
      expect(browserSecrets[name]).toBeUndefined();
    }
  });

  it('removes redactions from the schema and runtime views', () => {
    const script = json('schema/domains/speeches.json').$defs.speech.properties.script;
    expect(script.properties.redactions).toBeUndefined();
    expect(json('schema/domains/speeches.json').$defs.redaction).toBeUndefined();
    expect(read('src/components/SpeakerView.jsx')).not.toContain('SecretScript');
    expect(read('src/components/SpeakerView.jsx')).not.toContain('redactions');
    expect(read('src/components/SpeakerView.jsx')).not.toContain('unlockScript');
  });

  it('keeps whole-script encryption and the scoped key endpoint', () => {
    expect(read('src/admin/AdminSpeechesPanel.jsx')).toContain('parseSpeechDoc');
    expect(read('supabase/functions/_shared/speechBundle.js')).toContain('AES-256-GCM');
    expect(read('supabase/functions/reveal_speech_key/index.ts')).toContain(
      "payload.app_role !== 'speaker'",
    );
  });
});
