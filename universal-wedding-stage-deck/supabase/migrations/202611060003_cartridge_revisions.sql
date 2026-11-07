-- Issue #165: server-published cartridge revisions.
--
-- Cartridges are immutable, server-published snapshots. `admin_api` (service
-- role, allowlisted AAL2 owner) is the only writer. This migration adds the
-- monotonic revision and publication metadata, backfills existing rows, and
-- installs the atomic publish RPC used by `admin_api`.
--
-- Backfill notes
-- --------------
-- * Save a backup before applying in production, for example:
--     create table public.weddings_backup_165 as select * from public.weddings;
-- * A row that already has a cartridge is treated as the first published
--   revision: `cartridge_revision = 1`, source `legacy_backfill`, and the
--   publication time falls back to `updated_at`/`created_at`.
-- * Rows without a cartridge stay at revision 0 (never published). The first
--   admin publication becomes revision 1.
-- * Re-running this migration is safe: columns/constraints are guarded and the
--   backfill only touches rows that still have revision 0.
--
-- Rollback notes
-- --------------
--   drop function if exists public.stage_deck_publish_cartridge(
--     text, text, text, text, jsonb, timestamptz, text, bigint, uuid
--   );
--   alter table public.weddings
--     drop constraint if exists weddings_cartridge_revision_nonnegative,
--     drop column if exists cartridge_published_by,
--     drop column if exists cartridge_published_at,
--     drop column if exists cartridge_source,
--     drop column if exists cartridge_revision;
-- Rollback does not rewrite historical cartridge content; the backup table is
-- the authoritative restoration source.

alter table public.weddings
  add column if not exists cartridge_revision bigint not null default 0,
  add column if not exists cartridge_source text,
  add column if not exists cartridge_published_at timestamptz,
  add column if not exists cartridge_published_by uuid;

do $$
begin
  alter table public.weddings
    add constraint weddings_cartridge_revision_nonnegative
    check (cartridge_revision >= 0);
exception
  when duplicate_object then null;
end $$;

-- Existing published rows become revision 1 so role clients can start
-- comparing revisions immediately after the migration.
update public.weddings
set
  cartridge_revision = 1,
  cartridge_source = coalesce(cartridge_source, 'legacy_backfill'),
  cartridge_published_at = coalesce(cartridge_published_at, updated_at, created_at)
where cartridge is not null
  and cartridge_revision = 0;

-- Stage roles only ever read wedding rows. Mutation rights stay with the
-- service role used by the Edge Functions.
revoke insert, update, delete, truncate, references, trigger
  on public.weddings from anon, authenticated;
grant select on public.weddings to authenticated;

-- Atomic publication.
--
-- * `p_expected_revision` is the optimistic-concurrency guard. For an existing
--   wedding it must equal the current revision. A brand-new wedding must pass
--   0 (or null on the very first insert path).
-- * The function never changes `room_code`, `wedding_roles`, `role_sessions`,
--   `role_presence` or `live_sync_state`. A content-only publication therefore
--   preserves the share link, PINs, sessions and live progress.
-- * A stale revision raises SQLSTATE 40001 with message
--   `stale_cartridge_revision`; `admin_api` maps it to HTTP 409.
create or replace function public.stage_deck_publish_cartridge(
  p_wedding_id text,
  p_room_code text,
  p_couple text,
  p_date text,
  p_cartridge jsonb,
  p_expires_at timestamptz,
  p_source text,
  p_expected_revision bigint,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.weddings%rowtype;
  v_old_revision bigint := 0;
  v_new_revision bigint;
  v_published_at timestamptz := now();
  v_source text := coalesce(nullif(p_source, ''), 'admin_json');
begin
  if p_wedding_id is null or p_wedding_id = '' then
    raise exception 'wedding id required' using errcode = '22023';
  end if;
  if p_cartridge is null or jsonb_typeof(p_cartridge) <> 'object' then
    raise exception 'cartridge must be a JSON object' using errcode = '22023';
  end if;

  select * into v_existing
  from public.weddings
  where wedding_id = p_wedding_id
  for update;

  if found then
    v_old_revision := coalesce(v_existing.cartridge_revision, 0);

    if p_expected_revision is not null and p_expected_revision <> v_old_revision then
      raise exception 'stale_cartridge_revision'
        using errcode = '40001',
              detail = format('expected %s but current revision is %s',
                              p_expected_revision, v_old_revision);
    end if;

    v_new_revision := v_old_revision + 1;

    update public.weddings
    set
      cartridge = p_cartridge,
      couple = coalesce(p_couple, couple),
      date = coalesce(p_date, date),
      expires_at = coalesce(p_expires_at, expires_at),
      cartridge_revision = v_new_revision,
      cartridge_source = v_source,
      cartridge_published_at = v_published_at,
      cartridge_published_by = p_actor
    where wedding_id = p_wedding_id;

    return jsonb_build_object(
      'wedding_id', p_wedding_id,
      'room_code', v_existing.room_code,
      'created', false,
      'previous_revision', v_old_revision,
      'cartridge_revision', v_new_revision,
      'cartridge_source', v_source,
      'cartridge_published_at', v_published_at
    );
  end if;

  if p_expected_revision is not null and p_expected_revision <> 0 then
    raise exception 'stale_cartridge_revision'
      using errcode = '40001',
            detail = 'wedding does not exist; expected revision 0';
  end if;
  if p_room_code is null or p_room_code = '' then
    raise exception 'room code required for a new wedding' using errcode = '22023';
  end if;

  v_new_revision := 1;

  insert into public.weddings (
    wedding_id,
    room_code,
    couple,
    date,
    cartridge,
    expires_at,
    cartridge_revision,
    cartridge_source,
    cartridge_published_at,
    cartridge_published_by
  )
  values (
    p_wedding_id,
    p_room_code,
    p_couple,
    p_date,
    p_cartridge,
    coalesce(p_expires_at, now() + interval '30 days'),
    v_new_revision,
    v_source,
    v_published_at,
    p_actor
  );

  return jsonb_build_object(
    'wedding_id', p_wedding_id,
    'room_code', p_room_code,
    'created', true,
    'previous_revision', 0,
    'cartridge_revision', v_new_revision,
    'cartridge_source', v_source,
    'cartridge_published_at', v_published_at
  );
exception
  when unique_violation then
    -- Two concurrent first publications: the loser retries with the current
    -- revision instead of overwriting the winner.
    raise exception 'stale_cartridge_revision'
      using errcode = '40001',
            detail = 'concurrent publication';
end $$;

revoke all on function public.stage_deck_publish_cartridge(
  text, text, text, text, jsonb, timestamptz, text, bigint, uuid
) from public, anon, authenticated;

grant execute on function public.stage_deck_publish_cartridge(
  text, text, text, text, jsonb, timestamptz, text, bigint, uuid
) to service_role;
