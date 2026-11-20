-- Issue #846: revocation must block reads and updates, not only writes.
-- Every stage-role policy now requires an active role_sessions row.

drop policy if exists "room read" on public.live_sync_state;
create policy "room read"
  on public.live_sync_state for select
  to authenticated
  using (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in (
      'mc', 'dj', 'photo', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'
    )
    and public.current_session_active()
  );

drop policy if exists "wedding read" on public.weddings;
create policy "wedding read"
  on public.weddings for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in (
      'mc', 'dj', 'photo', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'
    )
    and public.current_session_active()
  );

drop policy if exists "song request queue read" on public.song_requests;
create policy "song request queue read"
  on public.song_requests for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj')
    and public.current_session_active()
  );

drop policy if exists "song request queue update" on public.song_requests;
create policy "song request queue update"
  on public.song_requests for update
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj')
    and public.current_session_active()
  )
  with check (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj')
    and public.current_session_active()
    and status in ('accepted', 'declined')
  );
