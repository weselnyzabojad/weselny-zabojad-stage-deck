import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #846 active session RLS enforcement', () => {
  it('requires an active role session on every stage-role read/update policy', () => {
    const sql = read('supabase/migrations/202611130001_active_session_rls.sql');

    for (const policy of [
      'room read',
      'wedding read',
      'song request queue read',
      'song request queue update',
    ]) {
      expect(sql).toContain(`create policy "${policy}"`);
    }

    expect(sql.match(/public\.current_session_active\(\)/g)).toHaveLength(5);
    expect(sql).not.toContain('to anon');
  });
});
