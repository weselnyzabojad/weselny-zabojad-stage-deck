import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #925 admin speech lifecycle UI', () => {
  it('keeps the Doc mode read-only and gates LIGHT metadata vs COMPLEX Docs', () => {
    const panel = read('src/admin/AdminSpeechesPanel.jsx');
    expect(panel).toContain("mode !== 'LIGHT' && mode !== 'COMPLEX'");
    expect(panel).toContain('from the wedding Doc · read-only');
    expect(panel).toContain('Speech management is disabled');
    expect(panel).toContain("mode === 'COMPLEX' ? 'Add speech + create Doc'");
    expect(panel).toContain('Add metadata-only speech');
    expect(panel).toContain('LIGHT records metadata only');
    expect(panel).not.toContain('setSpeechMode');
    expect(panel).not.toContain('changeMode');
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
      'upsertSpeechMetadata',
    ]) {
      expect(api).toContain(`function ${fn}`);
    }
    expect(api).not.toContain('function setSpeechMode');
    expect(read('supabase/functions/admin_api/index.ts')).toContain(
      "action === 'upsert_speech_metadata'",
    );
  });
});
