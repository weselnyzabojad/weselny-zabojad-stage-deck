-- Sprint 2 / issue #6: Realtime room state for the stage deck.
-- Run in the Supabase SQL editor (or save as a migration).

create table if not exists public.live_sync_state (
  wedding_id text primary key,
  pin        text,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Realtime needs the table in the publication. Ignore "already member".
do $$
begin
  alter publication supabase_realtime add table public.live_sync_state;
exception
  when duplicate_object then null;
end $$;

alter table public.live_sync_state enable row level security;

-- The room key (wedding_id) + 4-digit PIN are the only secrets the client has,
-- and the anon key is public. These policies allow any paired client to read
-- and write room rows; they are intentionally permissive for the MVP.
-- Harden before production (see README "Security notes").
drop policy if exists "stage deck read" on public.live_sync_state;
create policy "stage deck read"
  on public.live_sync_state for select
  to anon, authenticated
  using (true);

drop policy if exists "stage deck insert" on public.live_sync_state;
create policy "stage deck insert"
  on public.live_sync_state for insert
  to anon, authenticated
  with check (true);

drop policy if exists "stage deck update" on public.live_sync_state;
create policy "stage deck update"
  on public.live_sync_state for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on table public.live_sync_state to anon, authenticated;
