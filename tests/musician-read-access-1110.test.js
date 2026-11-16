import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const sql = read('supabase/migrations/202611150003_musician_role.sql');

describe('issue #1110 musician live-state read access', () => {
  it('grants musician reads for the room and wedding rows', () => {
    for (const policy of ['room read', 'wedding read']) {
      const block = sql.slice(
        sql.indexOf(`create policy "${policy}"`),
        sql.indexOf(';', sql.indexOf(`create policy "${policy}"`)),
      );
      expect(block).toContain("'musician'");
      expect(block).toContain('public.current_session_active()');
    }
  });

  it('keeps the musician out of room write policies', () => {
    expect(sql).not.toContain('create policy "room insert"');
    expect(sql).not.toContain('create policy "room update"');
    const writes = read('supabase/migrations/202611160001_live_state_writes.sql');
    expect(writes).not.toContain("'musician'");
  });

  it('keeps the role list scoped to the token wedding', () => {
    expect(sql).toContain("wedding_id = 'wzsd:' || public.current_wedding_id()");
    expect(sql).toContain('wedding_id = public.current_wedding_id()');
  });
});
