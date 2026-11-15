import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1046 archived weddings are read-only', () => {
  it('blocks every mutating admin_api action centrally', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    const set = api.slice(api.indexOf('const ARCHIVED_BLOCKED_ACTIONS'), api.indexOf(']);', api.indexOf('const ARCHIVED_BLOCKED_ACTIONS')));
    for (const action of [
      'publish',
      'publish_speech',
      'upsert_speech_metadata',
      'publish_game_questions',
      'upsert_provider',
      'upsert_musician',
      'migrate_docs',
      'rotate_pins',
    ]) {
      expect(set, action).toContain(`'${action}'`);
    }
    expect(api).toContain("code: 'wedding_archived'");
    expect(api).toContain("'archived_write_blocked'");
  });

  it('revokes role, speech and presence access when archiving', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    const block = api.slice(api.indexOf("if (action === 'archive')"), api.indexOf("if (action === 'delete')"));
    expect(block).toContain("from('role_sessions')");
    expect(block).toContain("from('speech_sessions')");
    expect(block).toContain("from('role_presence')");
    expect(block).toContain('revoked_at: archivedAt');
  });

  it('guards Drive create, rename and parse actions', () => {
    const drive = read('supabase/functions/admin_drive/index.ts');
    expect(drive).toContain('async function requireWritableWedding');
    for (const action of [
      'create_speech_doc',
      'rename_speech_doc',
      'parse_speech_doc',
      'create_game_question_doc',
      'rewrite_game_question_doc_columns',
      'parse_game_question_doc',
    ]) {
      expect(drive, action).toContain(`'${action}'`);
    }
    expect(drive).toContain("code: 'wedding_archived'");
    expect(drive).toContain('requireWritableWedding(admin, weddingId)');
  });

  it('keeps listing and archive/delete available', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    const set = api.slice(api.indexOf('const ARCHIVED_BLOCKED_ACTIONS'), api.indexOf(']);', api.indexOf('const ARCHIVED_BLOCKED_ACTIONS')));
    expect(set).not.toContain("'list'");
    expect(set).not.toContain("'archive'");
    expect(set).not.toContain("'delete'");
  });
});
