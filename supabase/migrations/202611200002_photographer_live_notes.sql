-- Issue #1310: photographers and the camera operator keep an operational
-- briefing note in the live room state, never in the published cartridge.
--
-- Media roles cannot write `live_sync_state` directly (issue #1106 limits
-- direct room writes to mc, dj_mc and venue_manager). This security-definer
-- RPC derives the wedding from the signed role token and updates only the
-- `photographer_notes` key of the live state row.

create or replace function public.stage_deck_set_photographer_notes(
  p_notes text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  wid text := public.current_wedding_id();
  app_role text := public.current_app_role();
  sid uuid := public.current_session_jti();
  value text := btrim(coalesce(p_notes, ''));
begin
  if wid is null or app_role is null or sid is null then
    raise exception 'No device claims' using errcode = '42501';
  end if;

  if app_role not in ('photo1', 'photo2', 'video') then
    raise exception 'Role cannot edit photographer notes' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.role_sessions s
    where s.jti = sid
      and s.wedding_id = wid
      and s.revoked_at is null
      and s.expires_at > now()
  ) then
    raise exception 'Session revoked or expired' using errcode = '42501';
  end if;

  if char_length(value) > 500 then
    raise exception 'Photographer notes are limited to 500 characters'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.weddings w where w.wedding_id = wid
  ) then
    raise exception 'Wedding not found' using errcode = 'P0002';
  end if;

  insert into public.live_sync_state (wedding_id, state, updated_at)
  values (
    'wzsd:' || wid,
    jsonb_build_object('photographer_notes', value),
    now()
  )
  on conflict (wedding_id) do update
  set state = jsonb_set(
        coalesce(live_sync_state.state, '{}'::jsonb),
        '{photographer_notes}',
        to_jsonb(value),
        true
      ),
      updated_at = now();

  return value;
end;
$$;

revoke all on function public.stage_deck_set_photographer_notes(text) from public, anon;
grant execute on function public.stage_deck_set_photographer_notes(text) to authenticated;
