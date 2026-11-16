import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const sql = read('supabase/migrations/202611160002_musician_song_suggestions.sql');

describe('issue #1108 musician song suggestion backend', () => {
  it('creates the per-musician suggestion table with a pending/played lifecycle', () => {
    expect(sql).toContain('create table if not exists public.musician_song_suggestions');
    expect(sql).toContain('musician_id   uuid not null references public.wedding_musicians(id) on delete cascade');
    expect(sql).toContain("status        text not null default 'pending' check (status in ('pending', 'played'))");
    expect(sql).toContain('played_at     timestamptz');
    expect(sql).toContain('musician_song_suggestions_played_pair');
  });

  it('scopes musician rows to the JWT wedding and musician id', () => {
    expect(sql).toContain('create or replace function public.current_musician_id()');
    expect(sql).toContain("auth.jwt() ->> 'musician_id'");
    expect(sql).toContain('musician_id = public.current_musician_id()');
    expect(sql).toContain("public.current_app_role() = 'musician'");
    expect(sql).toContain("status = 'pending'");
  });

  it('lets the DJ read the wedding and only mark pending rows played', () => {
    expect(sql).toContain('create policy "musician suggestion dj read"');
    expect(sql).toContain('create policy "musician suggestion dj play"');
    expect(sql).toContain("public.current_app_role() = 'dj'");
    expect(sql).toContain("status = 'played'");
    expect(sql).toContain('played_at is not null');
  });

  it('guards content fields against DJ edits and musician status edits', () => {
    expect(sql).toContain('guard_musician_song_suggestion_update');
    expect(sql).toContain("app_role = 'dj'");
    expect(sql).toContain('The DJ may only mark a suggestion played.');
    expect(sql).toContain("app_role = 'musician'");
    expect(sql).toContain('Only the DJ may mark a suggestion played.');
    expect(sql).toContain('Played suggestions are read-only.');
  });

  it('keeps anon blocked and adds the table to Realtime', () => {
    expect(sql).toContain('revoke all on public.musician_song_suggestions from anon, authenticated');
    expect(sql).toContain('grant select, insert, update, delete on public.musician_song_suggestions to authenticated');
    expect(sql).toContain('alter publication supabase_realtime add table public.musician_song_suggestions');
    expect(sql).toContain('when duplicate_object then null');
  });
});
