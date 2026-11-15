import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1039 scoped reveal_speech_key', () => {
  it('requires the token speech id to match the requested speech', () => {
    const fn = read('supabase/functions/reveal_speech_key/index.ts');
    expect(fn).toContain("typeof payload.speech_id === 'string'");
    expect(fn).toContain('tokenSpeechId !== speechId');
    expect(fn).toContain('not valid for that speech');
  });

  it('requires published, enabled and non-revoked speech access', () => {
    const fn = read('supabase/functions/reveal_speech_key/index.ts');
    expect(fn).toContain("from('speech_access')");
    expect(fn).toContain("speech.status !== 'PUBLISHED'");
    expect(fn).toContain('speech.speaker_access !== true');
    expect(fn).toContain('!access?.enabled');
    expect(fn).toContain('access.revoked_at');
  });

  it('removes the legacy cartridge speech lookup', () => {
    const fn = read('supabase/functions/reveal_speech_key/index.ts');
    expect(fn).not.toContain('cartridge');
    expect(fn).not.toContain('visibleToRoles');
    expect(fn).not.toContain("from('weddings')");
  });

  it('keeps speech_bundle as the single key delivery path', () => {
    const bundle = read('supabase/functions/speech_bundle/index.ts');
    expect(bundle).toContain('deriveSpeechKeyBytes');
    expect(bundle).toContain('speech_access');
    const client = read('src/lib/speechBundleClient.js');
    expect(client).toContain('speech_bundle');
  });
});
