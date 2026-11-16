import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/202611160001_live_state_writes.sql');

describe('issue #1106 live-state writes for dj_mc and venue_manager', () => {
  it('allows exactly mc, dj_mc and venue_manager to insert and update the room', () => {
    const insert = migration.match(/create policy "room insert"[\s\S]*?with check \(([\s\S]*?)\);/);
    const update = migration.match(/create policy "room update"[\s\S]*?with check \(([\s\S]*?)\);/);

    expect(insert).not.toBeNull();
    expect(update).not.toBeNull();
    for (const block of [insert[1], update[1]]) {
      expect(block).toContain("public.current_app_role() in ('mc', 'dj_mc', 'venue_manager')");
      expect(block).toContain("wedding_id = 'wzsd:' || public.current_wedding_id()");
      expect(block).toContain('public.current_session_active()');
      expect(block).toContain('select 1 from public.weddings w');
    }
  });

  it('does not expose writes to other stage roles or anon', () => {
    for (const role of ["'dj'", "'photo1'", "'photo2'", "'video'", "'speaker'", "'musician'"]) {
      expect(migration).not.toContain(`current_app_role() in (${role}`);
    }
    expect(migration).not.toContain('to anon');
    expect(migration).not.toContain('grant ');
  });

  it('keeps the base schema base-only', () => {
    const schema = read('supabase/schema.sql');
    expect(schema).toContain('schema.sql is base-only');
    expect(schema).not.toContain('202611160001_live_state_writes');
  });
});
