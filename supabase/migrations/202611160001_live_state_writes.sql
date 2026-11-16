-- Issue #1106: let DJ + MC and the Venue Manager publish the live room state.
-- The owner accepted full room-write access for these two roles; media, DJ-only,
-- Speaker and anon remain read-only or blocked. schema.sql stays base-only, so
-- this replaces the effective insert/update policies from the migration chain.

drop policy if exists "room insert" on public.live_sync_state;
create policy "room insert"
  on public.live_sync_state for insert
  to authenticated
  with check (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj_mc', 'venue_manager')
    and public.current_session_active()
    and exists (
      select 1 from public.weddings w
      where w.wedding_id = public.current_wedding_id()
    )
  );

drop policy if exists "room update" on public.live_sync_state;
create policy "room update"
  on public.live_sync_state for update
  to authenticated
  using (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj_mc', 'venue_manager')
    and public.current_session_active()
    and exists (
      select 1 from public.weddings w
      where w.wedding_id = public.current_wedding_id()
    )
  )
  with check (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in ('mc', 'dj_mc', 'venue_manager')
    and public.current_session_active()
    and exists (
      select 1 from public.weddings w
      where w.wedding_id = public.current_wedding_id()
    )
  );
