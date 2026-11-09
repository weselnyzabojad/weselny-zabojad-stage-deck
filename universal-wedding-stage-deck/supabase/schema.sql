-- Supabase Realtime state for the stage deck.
-- Run in the Supabase SQL editor (or save as a migration).
--
-- D7 / P0.2: the cloud room key is `wzsd:<weddingId>`, never the DDMM PIN.
-- Production access uses 6-digit per-role PINs hashed in `wedding_roles` and
-- validated by the `join_room` Edge Function, which returns a short-lived JWT
-- with `{ wedding_id, room_id, app_role }`. RLS below checks those claims.
--
-- The service-role key stays in Edge Function secrets and is never shipped to
-- the browser. Do not add permissive `using (true)` policies.

create table if not exists public.live_sync_state (
  wedding_id text primary key,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

-- P0.2/P0.3: never store the display PIN in a publicly readable row.
alter table public.live_sync_state drop column if exists pin;

create table if not exists public.weddings (
  wedding_id text primary key,
  room_code  text not null unique,
  couple     text,
  date       text,
  cartridge  jsonb,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TTL for existing deployments.
alter table public.weddings
  add column if not exists expires_at timestamptz not null default (now() + interval '30 days');

create index if not exists weddings_expires_idx on public.weddings (expires_at);

create table if not exists public.wedding_roles (
  wedding_id  text not null references public.weddings(wedding_id) on delete cascade,
  role        text not null check (role in ('mc', 'dj', 'photo', 'speaker')),
  pin_hash    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (wedding_id, role)
);

-- Legacy table kept only so the historical owner-admin migration can apply.
-- Migration 202611070001 drops it after the VIP Radar / Contacts removal.
create table if not exists public.sensitive_notes (
  wedding_id text primary key references public.weddings(wedding_id) on delete cascade,
  bundle     jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rate-limit log for join_room: 5 failed attempts per room/role/IP / 15 min.
-- IPs are hashed before they reach the table; there is no client access.
create table if not exists public.join_attempts (
  id           bigint generated always as identity primary key,
  room_code    text not null,
  role         text not null,
  ip_hash      text not null,
  success      boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index if not exists join_attempts_window_idx
  on public.join_attempts (room_code, role, ip_hash, attempted_at);

-- Public guest song requests (issue #148). Guests submit only through the
-- submit_song_request Edge Function using the service role. Browser clients can
-- never insert or read this table directly; joined MC/DJ tokens can read and
-- triage requests later.
create table if not exists public.song_requests (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  text not null references public.weddings(wedding_id) on delete cascade,
  song        text not null check (char_length(song) between 1 and 120),
  artist      text not null check (char_length(artist) between 1 and 120),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  source      text not null default 'guest_qr' check (source in ('guest_qr')),
  device_id   text check (device_id is null or char_length(device_id) between 8 and 64),
  played_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists song_requests_queue_idx
  on public.song_requests (wedding_id, status, created_at);

create index if not exists song_requests_device_cooldown_idx
  on public.song_requests (wedding_id, device_id, created_at desc);

create index if not exists song_requests_queue_state_idx
  on public.song_requests (wedding_id, status, played_at, created_at);

-- Rate-limit log for submit_song_request. IPs are hashed before insert and this
-- table has no client policies.
create table if not exists public.song_request_attempts (
  id           bigint generated always as identity primary key,
  room_code    text not null,
  ip_hash      text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists song_request_attempts_window_idx
  on public.song_request_attempts (room_code, ip_hash, attempted_at);

-- Realtime needs the state table in the publication. Ignore "already member".
do $$
begin
  alter publication supabase_realtime add table public.live_sync_state;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Server-side timestamps (reel clock + cross-device ordering)
-- ---------------------------------------------------------------------------
create or replace function public.stage_deck_server_time()
returns timestamptz
language sql
stable
as $$ select now(); $$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists touch_live_sync_state on public.live_sync_state;
create trigger touch_live_sync_state
  before insert or update on public.live_sync_state
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_weddings on public.weddings;
create trigger touch_weddings
  before insert or update on public.weddings
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_wedding_roles on public.wedding_roles;
create trigger touch_wedding_roles
  before insert or update on public.wedding_roles
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_song_requests on public.song_requests;
create trigger touch_song_requests
  before insert or update on public.song_requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Owner-admin service provider registry (admin_api only)
-- ---------------------------------------------------------------------------
create table if not exists public.wedding_service_providers (
  id             uuid primary key default gen_random_uuid(),
  wedding_id     text not null references public.weddings(wedding_id) on delete cascade,
  category       text not null check (category in ('dj', 'photo1', 'photo2', 'video', 'venue_manager', 'other')),
  function_label text,
  first_name     text not null check (char_length(first_name) between 1 and 120),
  last_name      text not null check (char_length(last_name) between 1 and 120),
  phone          text,
  email          text,
  address        text,
  instagram      text,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint wedding_service_providers_other_function
    check (category <> 'other' or (function_label is not null and char_length(function_label) between 1 and 120))
);

create unique index if not exists wedding_service_providers_role_unique_idx
  on public.wedding_service_providers (wedding_id, category)
  where category in ('dj', 'photo1', 'photo2', 'video', 'venue_manager');

create index if not exists wedding_service_providers_wedding_idx
  on public.wedding_service_providers (wedding_id, category, created_at);

drop trigger if exists touch_wedding_service_providers on public.wedding_service_providers;
create trigger touch_wedding_service_providers
  before insert or update on public.wedding_service_providers
  for each row execute function public.touch_updated_at();

alter table public.wedding_service_providers enable row level security;
revoke all on public.wedding_service_providers from anon, authenticated;

-- ---------------------------------------------------------------------------
-- JWT helpers (join_room issues these claims)
-- ---------------------------------------------------------------------------
create or replace function public.current_wedding_id()
returns text
language sql
stable
as $$ select nullif(auth.jwt() ->> 'wedding_id', ''); $$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$ select nullif(auth.jwt() ->> 'app_role', ''); $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.live_sync_state enable row level security;
alter table public.weddings       enable row level security;
alter table public.wedding_roles  enable row level security;
alter table public.join_attempts  enable row level security;
alter table public.song_requests enable row level security;
alter table public.song_request_attempts enable row level security;

-- Remove the old permissive MVP policies and recreate everything so this file
-- is safe to re-run on an existing deployment.
drop policy if exists "stage deck read"   on public.live_sync_state;
drop policy if exists "stage deck insert" on public.live_sync_state;
drop policy if exists "stage deck update" on public.live_sync_state;
drop policy if exists "room read"         on public.live_sync_state;
drop policy if exists "room insert"       on public.live_sync_state;
drop policy if exists "room update"       on public.live_sync_state;
drop policy if exists "wedding read"      on public.weddings;

-- A room token may only touch its own room key (wzsd:<weddingId>). Reads are
-- open to every joined role; writes are limited to the host role (MC).
-- The role claim must be one of the roles issued by join_room.
create policy "room read"
  on public.live_sync_state for select
  to authenticated
  using (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj', 'photo', 'speaker')
  );

create policy "room insert"
  on public.live_sync_state for insert
  to authenticated
  with check (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc')
    and exists (
      select 1 from public.weddings w
      where w.wedding_id = public.current_wedding_id()
    )
  );

create policy "room update"
  on public.live_sync_state for update
  to authenticated
  using (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc')
    and exists (
      select 1 from public.weddings w
      where w.wedding_id = public.current_wedding_id()
    )
  )
  with check (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc')
    and exists (
      select 1 from public.weddings w
      where w.wedding_id = public.current_wedding_id()
    )
  );

-- Joined devices may read only their own wedding row, and only with a role
-- claim from a join token.
create policy "wedding read"
  on public.weddings for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj', 'photo', 'speaker')
  );

-- `wedding_roles` and `join_attempts` intentionally have NO client policies:
-- only the service-role key (Edge Functions) can read/write their hashes.

-- Public song requests are inserted only by the service-role Edge Function.
-- Joined MC/DJ tokens may read and change status only (column grant below).
drop policy if exists "song request queue read" on public.song_requests;
drop policy if exists "song request queue update" on public.song_requests;

create policy "song request queue read"
  on public.song_requests for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj')
  );

create policy "song request queue update"
  on public.song_requests for update
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj')
  )
  with check (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj')
    and status in ('accepted', 'declined')
  );

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on public.live_sync_state from anon;
revoke all on public.weddings       from anon;
revoke all on public.wedding_roles  from anon;
revoke all on public.join_attempts  from anon;
revoke all on public.song_requests from anon, authenticated;
revoke all on public.song_request_attempts from anon, authenticated;

grant select, insert, update on public.live_sync_state to authenticated;
grant select on public.weddings to authenticated;
grant select on public.song_requests to authenticated;
grant update (status, played_at) on public.song_requests to authenticated;

grant execute on function public.stage_deck_server_time() to anon, authenticated;
revoke all on function public.current_wedding_id() from public, anon;
revoke all on function public.current_app_role()   from public, anon;
grant execute on function public.current_wedding_id()    to authenticated;
grant execute on function public.current_app_role()      to authenticated;

-- End-of-event wipe (service role / admin only): removes the room state and
-- the wedding row; roles and live state cascade.
create or replace function public.stage_deck_wipe_room(p_wedding_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.live_sync_state where wedding_id = 'wzsd:' || p_wedding_id;
  delete from public.weddings where wedding_id = p_wedding_id;
$$;

revoke all on function public.stage_deck_wipe_room(text) from public, anon, authenticated;

-- Client-triggered wipe: only the MC role token may remove its own room.
create or replace function public.stage_deck_wipe_my_room()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wid text := nullif(auth.jwt() ->> 'wedding_id', '');
begin
  if wid is null then
    raise exception 'No room claim';
  end if;
  if coalesce(auth.jwt() ->> 'app_role', '') <> 'mc' then
    raise exception 'Only the MC role may wipe this room';
  end if;

  delete from public.live_sync_state where wedding_id = 'wzsd:' || wid;
  delete from public.weddings where wedding_id = wid;
end $$;

grant execute on function public.stage_deck_wipe_my_room() to authenticated;
revoke all on function public.stage_deck_wipe_my_room() from public, anon;

-- TTL purge: deletes rooms past `expires_at` (state, wedding, roles, notes).
-- Schedule daily with pg_cron when available:
--   select cron.schedule(
--     'stage-deck-purge',
--     '15 4 * * *',
--     $$select public.stage_deck_purge_expired()$$
--   );
create or replace function public.stage_deck_purge_expired()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
  wid text;
begin
  for wid in select wedding_id from public.weddings where expires_at < now() loop
    delete from public.live_sync_state where wedding_id = 'wzsd:' || wid;
    delete from public.weddings where wedding_id = wid;
    removed := removed + 1;
  end loop;

  -- Orphaned room state (wedding row already removed) and old rate-limit logs.
  delete from public.live_sync_state s
  where not exists (
    select 1 from public.weddings w where 'wzsd:' || w.wedding_id = s.wedding_id
  );
  delete from public.join_attempts where attempted_at < now() - interval '30 days';

  return removed;
end $$;

revoke all on function public.stage_deck_purge_expired() from public, anon, authenticated;
