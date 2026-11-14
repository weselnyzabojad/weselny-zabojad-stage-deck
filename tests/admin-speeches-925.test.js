import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #925 admin speech lifecycle UI', () => {
  it('gates OFF, LIGHT and COMPLEX actions', () => {
    const panel = read('src/admin/AdminSpeechesPanel.jsx');
    for (const mode of ['OFF', 'LIGHT', 'COMPLEX']) {
      expect(panel).toContain(`'${mode}'`);
    }
    expect(panel).toContain('Speech management is disabled');
    expect(panel).toContain("mode === 'COMPLEX' ? 'Add speech + create Doc'");
    expect(panel).toContain('Add metadata-only speech');
    expect(panel).toContain("mode === 'COMPLEX' ?");
  });

  it('wires create, rename, parse, preview, publish, restore and delete', () => {
    const panel = read('src/admin/AdminSpeechesPanel.jsx');
    for (const call of [
      'createSpeechDoc',
      'renameSpeechDoc',
      'parseSpeechDoc',
      'publishSpeech',
      'restoreSpeech',
      'deleteSpeech',
      'upsertSpeechMetadata',
    ]) {
      expect(panel).toContain(call);
    }
    expect(panel).toContain('Speaker preview');
    expect(panel).toContain('MC preview');
    expect(panel).toContain('Admin logs');
    expect(panel).toContain("window.confirm('Delete this speech record?");
  });

  it('adds the client API surface and backend metadata action', () => {
    const api = read('src/admin/adminApi.js');
    for (const fn of [
      'listSpeeches',
      'createSpeechDoc',
      'renameSpeechDoc',
      'parseSpeechDoc',
      'publishSpeech',
      'restoreSpeech',
      'deleteSpeech',
      'setSpeechMode',
      'upsertSpeechMetadata',
    ]) {
      expect(api).toContain(`function ${fn}`);
    }
    expect(read('supabase/functions/admin_api/index.ts')).toContain(
      "action === 'upsert_speech_metadata'",
    );
  });
});
