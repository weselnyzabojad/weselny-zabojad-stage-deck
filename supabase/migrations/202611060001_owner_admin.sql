-- Owner admin panel (issue #76).
--
-- Apply after `supabase/schema.sql`:
--   supabase db push
-- or paste this file into the SQL editor.
--
-- The owner signs in with Supabase Auth (email/password) and a verified TOTP
-- factor (aal2). Only accounts present in `app_admins` may use `/deck/admin`.
-- There is no self-signup: add the owner in the dashboard/SQL and enroll TOTP
-- from the admin screen.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Admin allowlist + audit log
-- ---------------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "admin self read" on public.app_admins;
create policy "admin self read"
  on public.app_admins for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.app_admins from anon;
grant select on public.app_admins to authenticated;

-- Aal2 means the session passed TOTP MFA. The allowlist is checked separately.
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    and exists (
      select 1 from public.app_admins a where a.user_id = auth.uid()
    );
$$;

revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

create table if not exists public.admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_email text,
  action      text not null,
  target      text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_audit_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin read audit" on public.admin_audit_log;
create policy "admin read audit"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_app_admin());

revoke all on public.admin_audit_log from anon;
grant select on public.admin_audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- Per-device sessions + presence
-- ---------------------------------------------------------------------------
alter table public.weddings add column if not exists archived_at timestamptz;

create table if not exists public.role_sessions (
  jti           uuid primary key,
  wedding_id    text not null references public.weddings(wedding_id) on delete cascade,
  role          text not null check (role in ('mc', 'dj', 'photo', 'speaker')),
  device_id     text not null default 'unknown',
  device_label  text,
  issued_at     timestamptz not null default now(),
  expires_at    timestamptz not null,
  revoked_at    timestamptz,
  revoked_by    uuid
);

create index if not exists role_sessions_wedding_idx
  on public.role_sessions (wedding_id, issued_at desc);

alter table public.role_sessions enable row level security;

drop policy if exists "admin read sessions" on public.role_sessions;
create policy "admin read sessions"
  on public.role_sessions for select
  to authenticated
  using (public.is_app_admin());

revoke all on public.role_sessions from anon;
grant select on public.role_sessions to authenticated;

create or replace function public.current_session_jti()
returns uuid
language sql
stable
as $$ select nullif(auth.jwt() ->> 'jti', '')::uuid; $$;

create or replace function public.current_session_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.role_sessions s
    where s.jti = public.current_session_jti()
      and s.revoked_at is null
      and s.expires_at > now()
  );
$$;

revoke all on function public.current_session_jti() from public, anon;
grant execute on function public.current_session_jti() to authenticated;
revoke all on function public.current_session_active() from public, anon;
grant execute on function public.current_session_active() to authenticated;

create table if not exists public.role_presence (
  wedding_id      text not null references public.weddings(wedding_id) on delete cascade,
  role            text not null check (role in ('mc', 'dj', 'photo', 'speaker')),
  device_id       text not null,
  session_jti     uuid references public.role_sessions(jti) on delete set null,
  device_label    text,
  status          text not null default 'offline'
                  check (status in ('online', 'idle', 'offline')),
  current_view    text,
  last_seen       timestamptz not null default now(),
  token_expires_at timestamptz,
  primary key (wedding_id, role, device_id)
);

alter table public.role_presence enable row level security;

drop policy if exists "admin read presence" on public.role_presence;
create policy "admin read presence"
  on public.role_presence for select
  to authenticated
  using (public.is_app_admin());

revoke all on public.role_presence from anon;
grant select on public.role_presence to authenticated;

-- The device itself only updates its own presence row through this definer
-- function, which derives the room/role/session from the signed token.
create or replace function public.stage_deck_touch_presence(p_current_view text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wid text := nullif(auth.jwt() ->> 'wedding_id', '');
  app_role text := nullif(auth.jwt() ->> 'app_role', '');
  sid uuid := public.current_session_jti();
  device text;
  expires timestamptz;
begin
  if wid is null or app_role is null or sid is null then
    raise exception 'No device claims';
  end if;

  select s.device_id, s.expires_at into device, expires
  from public.role_sessions s
  where s.jti = sid and s.revoked_at is null and s.expires_at > now();

  if device is null then
    raise exception 'Session revoked or expired';
  end if;

  insert into public.role_presence
    (wedding_id, role, device_id, session_jti, status, current_view, last_seen, token_expires_at)
  values
    (wid, app_role, device, sid, 'online', p_current_view, now(), expires)
  on conflict (wedding_id, role, device_id) do update
    set session_jti = excluded.session_jti,
        status = 'online',
        current_view = coalesce(p_current_view, public.role_presence.current_view),
        last_seen = now(),
        token_expires_at = excluded.token_expires_at;
end $$;

revoke all on function public.stage_deck_touch_presence(text) from public, anon;
grant execute on function public.stage_deck_touch_presence(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Revoked sessions stop working immediately
-- ---------------------------------------------------------------------------
drop policy if exists "room read" on public.live_sync_state;
create policy "room read"
  on public.live_sync_state for select
  to authenticated
  using (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj', 'photo', 'speaker')
    and public.current_session_active()
  );

drop policy if exists "room insert" on public.live_sync_state;
create policy "room insert"
  on public.live_sync_state for insert
  to authenticated
  with check (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc')
    and public.current_session_active()
    and exists (
      select 1 from public.weddings w where w.wedding_id = public.current_wedding_id()
    )
  );

drop policy if exists "room update" on public.live_sync_state;
create policy "room update"
  on public.live_sync_state for update
  to authenticated
  using (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc')
    and public.current_session_active()
    and exists (
      select 1 from public.weddings w where w.wedding_id = public.current_wedding_id()
    )
  )
  with check (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc')
    and public.current_session_active()
    and exists (
      select 1 from public.weddings w where w.wedding_id = public.current_wedding_id()
    )
  );

drop policy if exists "wedding read" on public.weddings;
create policy "wedding read"
  on public.weddings for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj', 'photo', 'speaker')
    and public.current_session_active()
  );

drop policy if exists "sensitive host read" on public.sensitive_notes;
create policy "sensitive host read"
  on public.sensitive_notes for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'mc'
    and public.current_session_active()
  );

drop policy if exists "sensitive host insert" on public.sensitive_notes;
create policy "sensitive host insert"
  on public.sensitive_notes for insert
  to authenticated
  with check (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'mc'
    and public.current_session_active()
  );

drop policy if exists "sensitive host update" on public.sensitive_notes;
create policy "sensitive host update"
  on public.sensitive_notes for update
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'mc'
    and public.current_session_active()
  )
  with check (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() = 'mc'
    and public.current_session_active()
  );

-- Admin RPC helpers are intentionally not exposed: admin_api uses the service
-- role and audits every mutation.
