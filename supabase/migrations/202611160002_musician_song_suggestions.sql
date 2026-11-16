-- Issue #1108: durable per-musician song suggestions for the DJ VIP panel.
-- Musicians own only their pending rows; the DJ may only mark a pending row
-- played. Content fields are guarded by a trigger because RLS cannot compare
-- old and new column values.

create or replace function public.current_musician_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'musician_id', '')::uuid;
$$;

revoke all on function public.current_musician_id() from public, anon;
grant execute on function public.current_musician_id() to authenticated;

create table if not exists public.musician_song_suggestions (
  id            uuid primary key default gen_random_uuid(),
  wedding_id    text not null references public.weddings(wedding_id) on delete cascade,
  musician_id   uuid not null references public.wedding_musicians(id) on delete cascade,
  song          text not null check (char_length(song) between 1 and 120),
  artist        text not null check (char_length(artist) between 1 and 120),
  note          text check (char_length(note) <= 500),
  step_id       text check (char_length(step_id) <= 160),
  status        text not null default 'pending' check (status in ('pending', 'played')),
  played_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint musician_song_suggestions_played_pair
    check ((status = 'played') = (played_at is not null))
);

create index if not exists musician_song_suggestions_wedding_status_idx
  on public.musician_song_suggestions (wedding_id, status, created_at);

create index if not exists musician_song_suggestions_wedding_musician_idx
  on public.musician_song_suggestions (wedding_id, musician_id);

drop trigger if exists touch_musician_song_suggestions on public.musician_song_suggestions;
create trigger touch_musician_song_suggestions
  before insert or update on public.musician_song_suggestions
  for each row execute function public.touch_updated_at();

create or replace function public.guard_musician_song_suggestion_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  app_role text := public.current_app_role();
begin
  if app_role = 'dj' then
    if new.wedding_id is distinct from old.wedding_id
      or new.musician_id is distinct from old.musician_id
      or new.song is distinct from old.song
      or new.artist is distinct from old.artist
      or new.note is distinct from old.note
      or new.step_id is distinct from old.step_id
      or new.created_at is distinct from old.created_at
    then
      raise exception 'The DJ may only mark a suggestion played.';
    end if;
    if old.status <> 'pending' or new.status <> 'played' or new.played_at is null then
      raise exception 'Only a pending suggestion may be marked played.';
    end if;
  elsif app_role = 'musician' then
    if new.status is distinct from old.status
      or new.played_at is distinct from old.played_at
    then
      raise exception 'Only the DJ may mark a suggestion played.';
    end if;
    if old.status <> 'pending' then
      raise exception 'Played suggestions are read-only.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_musician_song_suggestion_update on public.musician_song_suggestions;
create trigger guard_musician_song_suggestion_update
  before update on public.musician_song_suggestions
  for each row execute function public.guard_musician_song_suggestion_update();

alter table public.musician_song_suggestions enable row level security;
revoke all on public.musician_song_suggestions from anon, authenticated;
grant select, insert, update, delete on public.musician_song_suggestions to authenticated;

drop policy if exists "musician suggestion own read" on public.musician_song_suggestions;
create policy "musician suggestion own read"
  on public.musician_song_suggestions for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'musician'
    and musician_id = public.current_musician_id()
  );

drop policy if exists "musician suggestion own insert" on public.musician_song_suggestions;
create policy "musician suggestion own insert"
  on public.musician_song_suggestions for insert
  to authenticated
  with check (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'musician'
    and musician_id = public.current_musician_id()
    and status = 'pending'
    and played_at is null
  );

drop policy if exists "musician suggestion own update" on public.musician_song_suggestions;
create policy "musician suggestion own update"
  on public.musician_song_suggestions for update
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'musician'
    and musician_id = public.current_musician_id()
    and status = 'pending'
  )
  with check (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'musician'
    and musician_id = public.current_musician_id()
    and status = 'pending'
    and played_at is null
  );

drop policy if exists "musician suggestion own delete" on public.musician_song_suggestions;
create policy "musician suggestion own delete"
  on public.musician_song_suggestions for delete
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'musician'
    and musician_id = public.current_musician_id()
    and status = 'pending'
  );

drop policy if exists "musician suggestion dj read" on public.musician_song_suggestions;
create policy "musician suggestion dj read"
  on public.musician_song_suggestions for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'dj'
  );

drop policy if exists "musician suggestion dj play" on public.musician_song_suggestions;
create policy "musician suggestion dj play"
  on public.musician_song_suggestions for update
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'dj'
    and status = 'pending'
  )
  with check (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'dj'
    and status = 'played'
    and played_at is not null
  );

do $$
begin
  alter publication supabase_realtime add table public.musician_song_suggestions;
exception
  when duplicate_object then null;
end $$;
