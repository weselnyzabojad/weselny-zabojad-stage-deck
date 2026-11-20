-- Issue #851: RLS is the primary boundary, but service-only tables should not
-- grant broad table privileges (including TRUNCATE) to authenticated users.

revoke all on public.app_admins from authenticated, anon;
revoke all on public.admin_audit_log from authenticated, anon;
revoke all on public.role_sessions from authenticated, anon;
revoke all on public.role_presence from authenticated, anon;
revoke all on public.wedding_roles from authenticated, anon;
revoke all on public.join_attempts from authenticated, anon;
revoke all on public.wedding_service_providers from authenticated, anon;
revoke all on public.cartridge_revisions from authenticated, anon;
revoke all on public.song_request_attempts from authenticated, anon;

-- Stage roles only need the room state read/write operations.
revoke all on public.live_sync_state from authenticated, anon;
grant select, insert, update on public.live_sync_state to authenticated;

-- Song queue rows are read by MC/DJ and only status/played_at are writable.
revoke all on public.song_requests from authenticated, anon;
grant select on public.song_requests to authenticated;
grant update (status, played_at) on public.song_requests to authenticated;

-- Weddings are read through the role projection RPC; keep only column reads.
revoke all on public.weddings from authenticated, anon;
grant select (
  wedding_id,
  room_code,
  couple,
  date,
  expires_at,
  archived_at,
  created_at,
  updated_at,
  cartridge_revision,
  cartridge_source,
  cartridge_source_metadata,
  cartridge_published_at
) on public.weddings to authenticated;
