import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1048 atomic speech and game revisions', () => {
  it('allocates under transaction advisory locks in SQL', () => {
    const sql = read('supabase/migrations/202611150005_atomic_revisions.sql');
    expect(sql).toContain('stage_deck_next_speech_revision');
    expect(sql).toContain('stage_deck_next_game_revision');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("'speech:' || p_wedding_id");
    expect(sql).toContain("'game:' || p_wedding_id || ':' || p_game_type");
    expect(sql).toContain('revoke all on function');
  });

  it('uses the RPC for every speech and game allocation path', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api.match(/stage_deck_next_speech_revision/g)?.length).toBeGreaterThanOrEqual(2);
    expect(api.match(/stage_deck_next_game_revision/g)?.length).toBeGreaterThanOrEqual(2);
    expect(api).not.toContain('Number(latest?.revision ?? 0) + 1');
  });

  it('maps duplicate revision conflicts to a retryable response', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("code: 'revision_conflict'");
    expect(api).toContain("String(revisionError.code ?? '') === '23505'");
    expect(api).toContain('Retry the operation.');
  });
});
