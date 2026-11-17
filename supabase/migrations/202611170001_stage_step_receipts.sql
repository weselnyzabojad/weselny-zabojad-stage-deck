-- Issue #1159: durable, revision-keyed read receipts for schedule changes.
--
-- A provider device acknowledges a reschedule revision (the `change.at` written
-- by `applyMediaOverride`) and the MC reads the rows to show who has seen the
-- change. Receipts deliberately live outside `live_sync_state`: letting provider
-- roles write the room row would let them overwrite the MC's show state.
--
-- Security model:
-- * only the security-definer `stage_deck_ack_step` writes, and it derives the
--   wedding, role and device from the signed role token + active session;
-- * select is granted to authenticated but RLS only exposes the current
--   wedding's rows to the MC (or an app admin);
-- * no direct insert/update/delete grant exists for any client role.

create table if not exists public.stage_step_receipts (
  wedding_id  text not null references public.weddings(wedding_id) on delete cascade,
  role        text not null
              check (role in ('dj', 'dj_mc', 'photo1', 'photo2', 'video',
                              'venue_manager', 'musician')),
  device_id   text not null check (char_length(device_id) between 1 and 120),
  step_id     text not null check (char_length(step_id) between 1 and 160),
  revision    timestamptz not null,
  seen_at     timestamptz not null default now(),
  primary key (wedding_id, role, device_id, step_id, revision)
);

create index if not exists stage_step_receipts_wedding_step_revision_idx
  on public.stage_step_receipts (wedding_id, step_id, revision);

alter table public.stage_step_receipts enable row level security;

drop policy if exists "mc read step receipts" on public.stage_step_receipts;
create policy "mc read step receipts"
  on public.stage_step_receipts for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and (public.current_app_role() = 'mc' or public.is_app_admin())
    and (public.current_session_active() or public.is_app_admin())
  );

revoke all on public.stage_step_receipts from public, anon, authenticated;
grant select on public.stage_step_receipts to authenticated;

-- The role  check  on presence stopped at `speaker` and rejected `dj_mc` and
-- `musician`, which `join_room` already issues. Widen it to every role that can
-- own a presence row; `photo` stays for legacy sessions.
alter table public.role_presence drop constraint if exists role_presence_role_check;
alter table public.role_presence
  add constraint role_presence_role_check
  check (role in ('mc', 'dj', 'dj_mc', 'photo', 'photo1', 'photo2', 'video',
                  'venue_manager', 'speaker', 'musician'));

-- Acknowledge one reschedule revision for the calling device. Idempotent: the
-- primary key makes a repeated ack a no-op. The caller cannot name another
-- wedding, role or device, and cannot use a revoked/expired session.
create or replace function public.stage_deck_ack_step(
  p_step_id text,
  p_revision timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  wid text := nullif(auth.jwt() ->> 'wedding_id', '');
  app_role text := public.current_app_role();
  sid uuid := public.current_session_jti();
  device text;
begin
  if wid is null or app_role is null or sid is null then
    raise exception 'No device claims';
  end if;

  if p_step_id is null or p_step_id = '' or char_length(p_step_id) > 160 then
    raise exception 'Invalid step id' using errcode = '22023';
  end if;
  if p_revision is null then
    raise exception 'Invalid revision' using errcode = '22023';
  end if;
  if app_role not in ('dj', 'dj_mc', 'photo1', 'photo2', 'video',
                      'venue_manager', 'musician') then
    raise exception 'Role cannot acknowledge step changes' using errcode = '42501';
  end if;

  select s.device_id into device
  from public.role_sessions s
  where s.jti = sid
    and s.revoked_at is null
    and s.expires_at > now();

  if device is null then
    raise exception 'Session revoked or expired' using errcode = '42501';
  end if;

  insert into public.stage_step_receipts
    (wedding_id, role, device_id, step_id, revision)
  values
    (wid, app_role, device, p_step_id, p_revision)
  on conflict (wedding_id, role, device_id, step_id, revision) do nothing;
end;
$$;

revoke all on function public.stage_deck_ack_step(text, timestamptz) from public, anon;
grant execute on function public.stage_deck_ack_step(text, timestamptz) to authenticated;

-- MC/admin read path for one revision. RLS is a second guard; this function
-- also refuses a revoked session and only ever returns the caller's wedding.
create or replace function public.stage_deck_step_receipts(
  p_step_id text,
  p_revision timestamptz
)
returns table (role text, device_id text, seen_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.current_app_role() = 'mc' or public.is_app_admin()) then
    raise exception 'Only the MC may read step receipts' using errcode = '42501';
  end if;
  if not public.is_app_admin() and not public.current_session_active() then
    raise exception 'Session revoked or expired' using errcode = '42501';
  end if;

  return query
    select r.role, r.device_id, r.seen_at
    from public.stage_step_receipts r
    where r.wedding_id = public.current_wedding_id()
      and r.step_id = p_step_id
      and r.revision = p_revision
    order by r.seen_at asc;
end;
$$;

revoke all on function public.stage_deck_step_receipts(text, timestamptz) from public, anon;
grant execute on function public.stage_deck_step_receipts(text, timestamptz) to authenticated;

-- Online presence for the MC badge row. `role_presence` is admin-only today;
-- this exposes the same rows for the current wedding to the MC, without widening
-- the table policy. The caller derives `online` from status + last_seen age.
create or replace function public.stage_deck_role_presence()
returns table (role text, status text, last_seen timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.current_app_role() = 'mc' or public.is_app_admin()) then
    raise exception 'Only the MC may read role presence' using errcode = '42501';
  end if;
  if not public.is_app_admin() and not public.current_session_active() then
    raise exception 'Session revoked or expired' using errcode = '42501';
  end if;

  return query
    select p.role, p.status, p.last_seen
    from public.role_presence p
    where p.wedding_id = public.current_wedding_id()
    order by p.last_seen desc;
end;
$$;

revoke all on function public.stage_deck_role_presence() from public, anon;
grant execute on function public.stage_deck_role_presence() to authenticated;

-- Realtime INSERT hints for the MC card. Guarded so the migration is safe to
-- re-run locally, unlike a bare `alter publication ... add table`.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'stage_step_receipts'
    )
  then
    execute 'alter publication supabase_realtime add table public.stage_step_receipts';
  end if;
end;
$$;
