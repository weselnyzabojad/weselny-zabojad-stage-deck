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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wedding_roles (
  wedding_id  text not null references public.weddings(wedding_id) on delete cascade,
  role        text not null check (role in ('mc', 'dj', 'pocket', 'photo', 'speaker')),
  pin_hash    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (wedding_id, role)
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

-- Remove the old permissive MVP policies.
drop policy if exists "stage deck read"   on public.live_sync_state;
drop policy if exists "stage deck insert" on public.live_sync_state;
drop policy if exists "stage deck update" on public.live_sync_state;

-- A room token may only touch its own room key (wzsd:<weddingId>).
create policy "room read"
  on public.live_sync_state for select
  to authenticated
  using (wedding_id = 'wzsd:' || public.current_wedding_id());

create policy "room insert"
  on public.live_sync_state for insert
  to authenticated
  with check (wedding_id = 'wzsd:' || public.current_wedding_id());

create policy "room update"
  on public.live_sync_state for update
  to authenticated
  using (wedding_id = 'wzsd:' || public.current_wedding_id())
  with check (wedding_id = 'wzsd:' || public.current_wedding_id());

-- Joined devices may read only their own wedding row.
create policy "wedding read"
  on public.weddings for select
  to authenticated
  using (wedding_id = public.current_wedding_id());

-- `wedding_roles` and `join_attempts` intentionally have NO client policies:
-- only the service-role key (Edge Functions) can read/write their hashes.

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on public.live_sync_state from anon;
revoke all on public.weddings       from anon;
revoke all on public.wedding_roles  from anon;
revoke all on public.join_attempts  from anon;

grant select, insert, update on public.live_sync_state to authenticated;
grant select on public.weddings to authenticated;

grant execute on function public.stage_deck_server_time() to anon, authenticated;
grant execute on function public.current_wedding_id()    to authenticated;
grant execute on function public.current_app_role()      to authenticated;

-- End-of-event wipe (service role / admin only): removes the room state and
-- the wedding row; `wedding_roles` cascades.
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
