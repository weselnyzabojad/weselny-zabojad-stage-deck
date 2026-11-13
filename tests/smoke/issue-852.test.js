import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #852 fixed search_path', () => {
  it('pins every flagged helper function', () => {
    const sql = read('supabase/migrations/202611130006_fixed_search_path.sql');

    for (const fn of [
      'current_session_jti',
      'current_wedding_id',
      'current_app_role',
      'stage_deck_server_time',
      'touch_updated_at',
    ]) {
      expect(sql).toContain(`function public.${fn}()`);
    }

    expect(sql.match(/set search_path = public, pg_temp/g)).toHaveLength(5);
  });
});
