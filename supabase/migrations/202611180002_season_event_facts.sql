-- Issue #1215: durable, anonymized season facts and a public aggregate RPC.
--
-- Facts survive the 30-day wedding/live-state purge and the 90-day recap purge.
-- Only an opaque SHA-256 wedding key and aggregate counts are stored. The table
-- has no client grants or policies; the security-definer RPC is the only public
-- read path.

create table if not exists public.season_event_facts (
  wedding_key       text primary key
                    check (wedding_key ~ '^[0-9a-f]{64}$'),
  season_year       integer not null
                    check (season_year between 2000 and 2100),
  source_recap_id   uuid references public.wedding_recaps(id) on delete set null,
  guests_total      integer check (guests_total is null or guests_total >= 0),
  guests_pl         integer check (guests_pl is null or guests_pl >= 0),
  guests_fr         integer check (guests_fr is null or guests_fr >= 0),
  guests_other      integer check (guests_other is null or guests_other >= 0),
  country_code      text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  stolat_enabled    boolean not null default false,
  games_count       integer check (games_count is null or games_count >= 0),
  ceremony_parts    integer check (ceremony_parts is null or ceremony_parts >= 0),
  oczepiny_parts    integer check (oczepiny_parts is null or oczepiny_parts >= 0),
  animations_total  integer check (animations_total is null or animations_total >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists season_event_facts_year_idx
  on public.season_event_facts (season_year);

drop trigger if exists touch_season_event_facts on public.season_event_facts;
create trigger touch_season_event_facts
  before update on public.season_event_facts
  for each row execute function public.touch_updated_at();

alter table public.season_event_facts enable row level security;
revoke all on public.season_event_facts from public, anon, authenticated;

-- Backfill the facts that can still be derived while the source wedding exists.
-- Republishing uses an upsert on the same key; this backfill is idempotent and
-- never overwrites facts created by a live publish.
do $$
declare
  inserted_rows integer := 0;
  skipped_rows integer := 0;
begin
  with source as (
    select
      r.id as recap_id,
      r.wedding_id,
      r.payload,
      r.published_at,
      w.cartridge,
      w.venue_country,
      coalesce(
        case
          when w.cartridge -> 'extensions' ->> 'dateISO' ~ '^\d{4}-\d{2}-\d{2}$'
            then (w.cartridge -> 'extensions' ->> 'dateISO')::date
        end,
        r.published_at::date
      ) as event_date
    from public.wedding_recaps r
    join public.weddings w on w.wedding_id = r.wedding_id
    where r.revoked_at is null
      and r.expires_at > now()
      and r.payload ? 'summary'
  ),
  computed as (
    select
      source.*,
      case
        when jsonb_typeof(payload -> 'games') = 'array'
          then jsonb_array_length(payload -> 'games')
        when (payload -> 'summary' ->> 'gameCount') ~ '^\d+$'
          then (payload -> 'summary' ->> 'gameCount')::integer
        else null
      end as games_count,
      case
        when jsonb_typeof(payload -> 'ceremony') = 'array'
          then jsonb_array_length(payload -> 'ceremony')
        when (payload -> 'summary' ->> 'ceremonyPartCount') ~ '^\d+$'
          then (payload -> 'summary' ->> 'ceremonyPartCount')::integer
        else null
      end as ceremony_parts,
      case
        when cartridge -> 'oczepiny' is null then null
        when cartridge -> 'oczepiny' ->> 'enabled' = 'false' then 0
        when jsonb_typeof(cartridge -> 'oczepiny' -> 'subEvents') = 'array'
          then jsonb_array_length(cartridge -> 'oczepiny' -> 'subEvents')
        else 0
      end as oczepiny_parts
    from source
  )
  insert into public.season_event_facts (
    wedding_key,
    season_year,
    source_recap_id,
    guests_total,
    guests_pl,
    guests_fr,
    guests_other,
    country_code,
    stolat_enabled,
    games_count,
    ceremony_parts,
    oczepiny_parts,
    animations_total
  )
  select
    encode(digest(wedding_id, 'sha256'), 'hex'),
    extract(year from event_date)::integer,
    recap_id,
    case when (cartridge -> 'demographics' ->> 'total') ~ '^\d+$'
      then (cartridge -> 'demographics' ->> 'total')::integer end,
    case when (cartridge -> 'demographics' ->> 'pl') ~ '^\d+$'
      then (cartridge -> 'demographics' ->> 'pl')::integer end,
    case when (cartridge -> 'demographics' ->> 'fr') ~ '^\d+$'
      then (cartridge -> 'demographics' ->> 'fr')::integer end,
    case when (cartridge -> 'demographics' ->> 'other') ~ '^\d+$'
      then (cartridge -> 'demographics' ->> 'other')::integer end,
    case when venue_country ~ '^[A-Z]{2}$' then venue_country else null end,
    upper(replace(replace(
      coalesce(cartridge -> 'culturalRules' -> 'sto_lat' ->> 'status', ''),
      ' ', '_'), '-', '_')) in ('YES', 'ON_REQUEST'),
    games_count,
    ceremony_parts,
    oczepiny_parts,
    case
      when games_count is null or ceremony_parts is null or oczepiny_parts is null
        then null
      else games_count + ceremony_parts + oczepiny_parts
    end
  from computed
  on conflict (wedding_key) do nothing;

  get diagnostics inserted_rows = row_count;

  select count(*) into skipped_rows
  from public.wedding_recaps r
  join public.weddings w on w.wedding_id = r.wedding_id
  where r.revoked_at is null
    and r.expires_at > now()
    and not (r.payload ? 'summary');

  raise notice
    'season_event_facts backfill inserted % rows; skipped % incomplete recaps',
    inserted_rows, skipped_rows;
end;
$$;

-- Public aggregate read path. Only counts and the next wedding's city,
-- country and month/year are exposed. No names, addresses, venue names,
-- contacts, tokens or raw rows.
create or replace function public.get_public_season_stats(
  p_season_year integer default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with season as (
    select coalesce(p_season_year, extract(year from now())::integer) as season_year
  ),
  facts as (
    select f.*
    from public.season_event_facts f
    join season s on s.season_year = f.season_year
  ),
  destinations as (
    select
      country_code,
      count(*)::integer as weddings
    from facts
    where country_code is not null
    group by country_code
  ),
  next_wedding as (
    select
      w.venue_city,
      w.venue_country,
      candidate.event_date
    from public.weddings w
    cross join lateral (
      select case
        when w.cartridge -> 'extensions' ->> 'dateISO' ~ '^\d{4}-\d{2}-\d{2}$'
          then (w.cartridge -> 'extensions' ->> 'dateISO')::date
      end as event_date
    ) candidate
    where w.archived_at is null
      and nullif(trim(w.venue_city), '') is not null
      and w.venue_country ~ '^[A-Z]{2}$'
      and candidate.event_date is not null
      and candidate.event_date >= current_date
    order by candidate.event_date asc
    limit 1
  )
  select jsonb_build_object(
    'seasonYear', (select season_year from season),
    'generatedAt', now(),
    'hasData', exists(select 1 from facts),
    'coverage', jsonb_build_object(
      'weddings', (select count(*) from facts),
      'guestCounts', (select count(*) from facts where guests_total is not null),
      'countries', (select count(*) from facts where country_code is not null),
      'stolat', (select count(*) from facts where stolat_enabled),
      'animations', (select count(*) from facts where animations_total is not null)
    ),
    'kpis', jsonb_build_object(
      'guests', jsonb_build_object(
        'total', (select sum(guests_total) from facts),
        'pl', (select sum(guests_pl) from facts),
        'fr', (select sum(guests_fr) from facts),
        'other', (select sum(guests_other) from facts),
        'weddingsWithGuests', (select count(guests_total) from facts)
      ),
      'destinations', coalesce((
        select jsonb_agg(
          jsonb_build_object('country', country_code, 'weddings', weddings)
          order by weddings desc, country_code asc
        )
        from destinations
      ), '[]'::jsonb),
      'stolatWeddings', (select count(*) from facts where stolat_enabled),
      'animations', jsonb_build_object(
        'total', (select sum(animations_total) from facts),
        'games', (select sum(games_count) from facts),
        'ceremonyParts', (select sum(ceremony_parts) from facts),
        'oczepinyParts', (select sum(oczepiny_parts) from facts)
      )
    ),
    'nextWedding', (
      select jsonb_build_object(
        'city', venue_city,
        'country', venue_country,
        'month', extract(month from event_date)::integer,
        'year', extract(year from event_date)::integer
      )
      from next_wedding
    )
  );
$$;

revoke all on function public.get_public_season_stats(integer) from public;
grant execute on function public.get_public_season_stats(integer) to anon, authenticated;
