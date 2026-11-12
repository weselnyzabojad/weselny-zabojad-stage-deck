-- Issue #170: Drive publication provenance and restorable cartridge backups.
--
-- * `weddings.cartridge_source_metadata` records sanitized provenance for the
--   current published revision (Drive file id/name/MIME/version/checksum, or
--   backup restore details). It never contains Google credentials or tokens.
-- * `cartridge_revisions` stores every published snapshot. The previous row is
--   written before a replacement, so it is an automatic restorable backup.
-- * The publish RPC keeps its atomic revision/stale guard and now also records
--   the previous and new snapshots plus source metadata in one transaction.
--
-- Backfill/rollback notes
-- -----------------------
-- * Save a backup before applying in production:
--     create table public.weddings_backup_170 as select * from public.weddings;
-- * Existing published rows are backfilled into `cartridge_revisions` once.
-- * Rollback:
--     drop function if exists public.stage_deck_publish_cartridge(
--       text, text, text, text, jsonb, timestamptz, text, bigint, uuid, jsonb
--     );
--     drop table if exists public.cartridge_revisions;
--     alter table public.weddings drop column if exists cartridge_source_metadata;
--   Recreate the issue #165 function signature if a rollback is required.

alter table public.weddings
  add column if not exists cartridge_source_metadata jsonb;

create table if not exists public.cartridge_revisions (
  id bigserial primary key,
  wedding_id text not null references public.weddings(wedding_id) on delete cascade,
  revision bigint not null check (revision > 0),
  cartridge jsonb not null,
  source text not null default 'admin_json',
  source_metadata jsonb,
  published_at timestamptz not null default now(),
  published_by uuid,
  created_at timestamptz not null default now(),
  unique (wedding_id, revision)
);

create index if not exists cartridge_revisions_wedding_idx
  on public.cartridge_revisions (wedding_id, revision desc);

alter table public.cartridge_revisions enable row level security;
revoke all on public.cartridge_revisions from anon, authenticated;
revoke all on sequence public.cartridge_revisions_id_seq from anon, authenticated;

-- Backfill the current snapshot for already-published weddings.
insert into public.cartridge_revisions (
  wedding_id, revision, cartridge, source, source_metadata, published_at, published_by
)
select
  wedding_id,
  cartridge_revision,
  cartridge,
  coalesce(cartridge_source, 'legacy_backfill'),
  cartridge_source_metadata,
  coalesce(cartridge_published_at, updated_at, created_at, now()),
  cartridge_published_by
from public.weddings
where cartridge is not null
  and cartridge_revision > 0
on conflict (wedding_id, revision) do nothing;

-- Replace the issue #165 function with the provenance-aware signature. The
-- extra argument defaults to null so older named-argument callers keep working.
drop function if exists public.stage_deck_publish_cartridge(
  text, text, text, text, jsonb, timestamptz, text, bigint, uuid
);

create or replace function public.stage_deck_publish_cartridge(
  p_wedding_id text,
  p_room_code text,
  p_couple text,
  p_date text,
  p_cartridge jsonb,
  p_expires_at timestamptz,
  p_source text,
  p_expected_revision bigint,
  p_actor uuid,
  p_source_metadata jsonb default null
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

    -- Automatic backup of the current published snapshot before replacement.
    if v_existing.cartridge is not null and v_old_revision > 0 then
      insert into public.cartridge_revisions (
        wedding_id, revision, cartridge, source, source_metadata, published_at, published_by
      )
      values (
        p_wedding_id,
        v_old_revision,
        v_existing.cartridge,
        coalesce(v_existing.cartridge_source, 'legacy_backfill'),
        v_existing.cartridge_source_metadata,
        coalesce(v_existing.cartridge_published_at, v_existing.updated_at, v_published_at),
        v_existing.cartridge_published_by
      )
      on conflict (wedding_id, revision) do nothing;
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
      cartridge_source_metadata = p_source_metadata,
      cartridge_published_at = v_published_at,
      cartridge_published_by = p_actor
    where wedding_id = p_wedding_id;

    insert into public.cartridge_revisions (
      wedding_id, revision, cartridge, source, source_metadata, published_at, published_by
    )
    values (
      p_wedding_id, v_new_revision, p_cartridge, v_source, p_source_metadata,
      v_published_at, p_actor
    )
    on conflict (wedding_id, revision) do nothing;

    return jsonb_build_object(
      'wedding_id', p_wedding_id,
      'room_code', v_existing.room_code,
      'created', false,
      'previous_revision', v_old_revision,
      'cartridge_revision', v_new_revision,
      'cartridge_source', v_source,
      'cartridge_source_metadata', p_source_metadata,
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
    cartridge_source_metadata,
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
    p_source_metadata,
    v_published_at,
    p_actor
  );

  insert into public.cartridge_revisions (
    wedding_id, revision, cartridge, source, source_metadata, published_at, published_by
  )
  values (
    p_wedding_id, v_new_revision, p_cartridge, v_source, p_source_metadata,
    v_published_at, p_actor
  )
  on conflict (wedding_id, revision) do nothing;

  return jsonb_build_object(
    'wedding_id', p_wedding_id,
    'room_code', p_room_code,
    'created', true,
    'previous_revision', 0,
    'cartridge_revision', v_new_revision,
    'cartridge_source', v_source,
    'cartridge_source_metadata', p_source_metadata,
    'cartridge_published_at', v_published_at
  );
exception
  when unique_violation then
    raise exception 'stale_cartridge_revision'
      using errcode = '40001',
            detail = 'concurrent publication';
end $$;

revoke all on function public.stage_deck_publish_cartridge(
  text, text, text, text, jsonb, timestamptz, text, bigint, uuid, jsonb
) from public, anon, authenticated;

grant execute on function public.stage_deck_publish_cartridge(
  text, text, text, text, jsonb, timestamptz, text, bigint, uuid, jsonb
) to service_role;
