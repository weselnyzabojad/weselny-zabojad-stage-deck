-- Expand stage-role constraints and RLS for provider-provisioned roles.
-- photo remains as a legacy alias; photo1/photo2/video/venue_manager are now
-- first-class stage roles issued by join_room.

alter table public.wedding_roles drop constraint if exists wedding_roles_role_check;
alter table public.wedding_roles
  add constraint wedding_roles_role_check
  check (role in ('mc', 'dj', 'photo', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'));

alter table public.role_sessions drop constraint if exists role_sessions_role_check;
alter table public.role_sessions
  add constraint role_sessions_role_check
  check (role in ('mc', 'dj', 'photo', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'));

alter table public.role_presence drop constraint if exists role_presence_role_check;
alter table public.role_presence
  add constraint role_presence_role_check
  check (role in ('mc', 'dj', 'photo', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'));

drop policy if exists "room read" on public.live_sync_state;
create policy "room read"
  on public.live_sync_state for select
  to authenticated
  using (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj', 'photo', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker')
  );

drop policy if exists "wedding read" on public.weddings;
create policy "wedding read"
  on public.weddings for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj', 'photo', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker')
  );
