-- Issue #1134: immutable, private post-wedding recap snapshots.
-- Public links use a high-entropy token; only its SHA-256 hash is stored.
-- Admin previews/publishes through admin_api (service role); anon and
-- authenticated roles have no table access.

create table if not exists public.wedding_recaps (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      text not null references public.weddings(wedding_id) on delete cascade,
  token_hash      text not null unique,
  schema_version  integer not null default 1 check (schema_version > 0),
  payload         jsonb not null,
  published_at    timestamptz not null default now(),
  expires_at      timestamptz not null,
  revoked_at      timestamptz,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint wedding_recaps_expiry_after_publish
    check (expires_at > published_at)
);

create index if not exists wedding_recaps_wedding_idx
  on public.wedding_recaps (wedding_id, published_at desc);

create index if not exists wedding_recaps_expiry_idx
  on public.wedding_recaps (expires_at);

drop trigger if exists touch_wedding_recaps on public.wedding_recaps;
create trigger touch_wedding_recaps
  before insert or update on public.wedding_recaps
  for each row execute function public.touch_updated_at();

-- Short-lived rate-limit counters for the public token endpoint. Rows are
-- operational data and are purged with the recap cleanup.
create table if not exists public.recap_access_attempts (
  id            bigserial primary key,
  ip_hash       text not null,
  token_hash    text,
  attempted_at  timestamptz not null default now()
);

create index if not exists recap_access_attempts_ip_idx
  on public.recap_access_attempts (ip_hash, attempted_at desc);

alter table public.wedding_recaps enable row level security;
alter table public.recap_access_attempts enable row level security;

revoke all on public.wedding_recaps from anon, authenticated;
revoke all on public.recap_access_attempts from anon, authenticated;
revoke all on sequence public.recap_access_attempts_id_seq from anon, authenticated;

create or replace function public.stage_deck_purge_expired_recaps()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
begin
  delete from public.wedding_recaps
  where expires_at < now();

  get diagnostics removed = row_count;

  delete from public.recap_access_attempts
  where attempted_at < now() - interval '1 day';

  return removed;
end $$;

revoke all on function public.stage_deck_purge_expired_recaps()
  from public, anon, authenticated;
grant execute on function public.stage_deck_purge_expired_recaps()
  to service_role;

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'stage-deck-recap-retention') then
    perform cron.unschedule('stage-deck-recap-retention');
  end if;

  perform cron.schedule(
    'stage-deck-recap-retention',
    '5 5 * * *',
    $cron$select public.stage_deck_purge_expired_recaps()$cron$
  );
end $$;
