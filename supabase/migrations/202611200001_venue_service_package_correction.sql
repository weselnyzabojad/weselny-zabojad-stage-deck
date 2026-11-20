-- Issue #1309: the Venue Manager may correct the wedding service package.
--
-- The change is value-only. It never creates, revokes or reassigns roles,
-- PINs, sessions or VIP identities. The package lives inside the published
-- cartridge, so the write goes through a security-definer RPC instead of
-- widening table grants. The cartridge revision advances so every device
-- refreshes its cached snapshot; the previous and new cartridge snapshots are
-- recorded in the existing revision audit table.

create or replace function public.stage_deck_set_service_package(
  p_service_package text
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
  value text := nullif(btrim(p_service_package), '');
  wedding_row public.weddings%rowtype;
  old_revision bigint;
  new_revision bigint;
  published_at timestamptz := now();
  next_cartridge jsonb;
begin
  if wid is null or app_role is null or sid is null then
    raise exception 'No device claims' using errcode = '42501';
  end if;

  if app_role <> 'venue_manager' then
    raise exception 'Only the Venue Manager may correct the service package'
      using errcode = '42501';
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

  if value is null or value not in ('HOST_ONLY', 'DJ_MC', 'HOST_AND_DJ_VIP') then
    raise exception 'Invalid service package' using errcode = '22023';
  end if;

  select * into wedding_row
  from public.weddings
  where wedding_id = wid
  for update;

  if not found then
    raise exception 'Wedding not found' using errcode = 'P0002';
  end if;

  old_revision := coalesce(wedding_row.cartridge_revision, 0);
  new_revision := old_revision + 1;
  next_cartridge := jsonb_set(
    coalesce(wedding_row.cartridge, '{}'::jsonb),
    '{servicePackage}',
    to_jsonb(value),
    true
  );

  -- Preserve the pre-correction snapshot when the current revision has not
  -- already been recorded (the publish RPC records previous revisions).
  if wedding_row.cartridge is not null and old_revision > 0 then
    insert into public.cartridge_revisions (
      wedding_id, revision, cartridge, source, source_metadata,
      published_at, published_by
    )
    values (
      wid, old_revision, wedding_row.cartridge,
      coalesce(wedding_row.cartridge_source, 'legacy_backfill'),
      wedding_row.cartridge_source_metadata,
      coalesce(wedding_row.cartridge_published_at, wedding_row.updated_at, published_at),
      wedding_row.cartridge_published_by
    )
    on conflict (wedding_id, revision) do nothing;
  end if;

  update public.weddings
  set cartridge = next_cartridge,
      cartridge_revision = new_revision,
      cartridge_source = 'venue_manager',
      cartridge_source_metadata = null,
      cartridge_published_at = published_at,
      cartridge_published_by = null
  where wedding_id = wid;

  insert into public.cartridge_revisions (
    wedding_id, revision, cartridge, source, source_metadata,
    published_at, published_by
  )
  values (
    wid, new_revision, next_cartridge, 'venue_manager', null,
    published_at, null
  )
  on conflict (wedding_id, revision) do nothing;

  return value;
end;
$$;

revoke all on function public.stage_deck_set_service_package(text) from public, anon;
grant execute on function public.stage_deck_set_service_package(text) to authenticated;
