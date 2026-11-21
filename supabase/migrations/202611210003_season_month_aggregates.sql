-- Issue #1345: durable event month and month-scoped season aggregates.
alter table public.season_event_facts
  add column if not exists event_month smallint
    check (event_month is null or event_month between 1 and 12);

update public.season_event_facts f
set event_month = source.event_month
from (
  select
    encode(digest(w.wedding_id, 'sha256'), 'hex') as wedding_key,
    extract(month from coalesce(
      case
        when w.cartridge -> 'extensions' ->> 'dateISO' ~ '^\d{4}-\d{2}-\d{2}$'
          then (w.cartridge -> 'extensions' ->> 'dateISO')::date
      end,
      r.published_at::date
    ))::smallint as event_month
  from public.wedding_recaps r
  join public.weddings w on w.wedding_id = r.wedding_id
  where r.revoked_at is null
) source
where f.wedding_key = source.wedding_key
  and f.event_month is null;

create index if not exists season_event_facts_month_idx
  on public.season_event_facts (season_year, event_month);

drop function if exists public.get_public_season_stats(integer);

create or replace function public.get_public_season_stats(
  p_season_year integer default null,
  p_month integer default null
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
  month_facts as (
    select f.*
    from facts f
    where p_month is not null and f.event_month = p_month
  ),
  completed_destinations as (
    select country_code, count(*)::integer as completed
    from facts
    where country_code is not null
    group by country_code
  ),
  month_destinations as (
    select country_code, count(*)::integer as completed
    from month_facts
    where country_code is not null
    group by country_code
  ),
  planned_weddings as (
    select
      case
        when (w.cartridge -> 'demographics' ->> 'total') ~ '^\d+$'
          then (w.cartridge -> 'demographics' ->> 'total')::integer
        else null
      end as guests_total,
      w.venue_country,
      candidate.event_date
    from public.weddings w
    cross join lateral (
      select case
        when w.cartridge -> 'extensions' ->> 'dateISO' ~ '^\d{4}-\d{2}-\d{2}$'
          then (w.cartridge -> 'extensions' ->> 'dateISO')::date
      end as event_date
    ) candidate
    join season s on extract(year from candidate.event_date)::integer = s.season_year
    where w.archived_at is null and candidate.event_date is not null
  ),
  plan_counts as (
    select
      count(*)::integer as total,
      count(*) filter (where event_date < current_date)::integer as completed,
      count(*) filter (where event_date >= current_date)::integer as upcoming,
      sum(guests_total) as planned_guests
    from planned_weddings
  ),
  planned_destinations as (
    select venue_country as country_code, count(*)::integer as planned
    from planned_weddings
    where venue_country ~ '^[A-Z]{2}$'
    group by venue_country
  ),
  all_destinations as (
    select
      coalesce(p.country_code, c.country_code) as country_code,
      coalesce(p.planned, 0) as planned,
      coalesce(c.completed, 0) as completed
    from planned_destinations p
    full join completed_destinations c on c.country_code = p.country_code
  ),
  season_state as (
    select case
      when p.upcoming > 0 and p.completed = 0 then 'pre'
      when p.upcoming > 0 and p.completed > 0 then 'live'
      when p.completed > 0 and p.upcoming = 0 then 'post'
      when p.upcoming = 0 and p.completed = 0 and exists(select 1 from facts) then 'post'
      else 'none'
    end as state
    from plan_counts p
  ),
  next_wedding as (
    select w.venue_city, w.venue_country, candidate.event_date
    from public.weddings w
    cross join lateral (
      select case
        when w.cartridge -> 'extensions' ->> 'dateISO' ~ '^\d{4}-\d{2}-\d{2}$'
          then (w.cartridge -> 'extensions' ->> 'dateISO')::date
      end as event_date
    ) candidate
    join season s on extract(year from candidate.event_date)::integer = s.season_year
    where w.archived_at is null
      and nullif(trim(w.venue_city), '') is not null
      and w.venue_country ~ '^[A-Z]{2}$'
      and candidate.event_date is not null
      and candidate.event_date >= current_date
    order by candidate.event_date asc
    limit 1
  ),
  base as (
    select jsonb_build_object(
      'seasonYear', (select season_year from season),
      'generatedAt', now(),
      'hasData', exists(select 1 from facts),
      'coverage', jsonb_build_object(
        'weddings', (select count(*) from facts),
        'guestCounts', (select count(*) from facts where guests_total is not null),
        'countries', (select count(*) from facts where country_code is not null),
        'stolat', (select count(*) from facts where stolat_enabled),
        'animations', (select count(*) from facts where animations_total is not null),
        'compatibility', (select count(*) from facts where compatibility_total is not null)
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
            jsonb_build_object('country', country_code, 'weddings', completed)
            order by completed desc, country_code asc
          )
          from completed_destinations
        ), '[]'::jsonb),
        'stolatWeddings', (select count(*) from facts where stolat_enabled),
        'animations', jsonb_build_object(
          'total', (select sum(animations_total) from facts),
          'games', (select sum(games_count) from facts),
          'ceremonyParts', (select sum(ceremony_parts) from facts),
          'oczepinyParts', (select sum(oczepiny_parts) from facts)
        ),
        'compatibility', jsonb_build_object(
          'averagePercent', (
            select round(avg(compatibility_percent))::integer
            from facts where compatibility_percent is not null
          ),
          'answered', (select sum(compatibility_answered) from facts),
          'total', (select sum(compatibility_total) from facts),
          'weddings', (select count(*) from facts where compatibility_total is not null),
          'topQuestion', (
            select jsonb_build_object(
              'key', entry ->> 'key',
              'answered', sum((entry ->> 'answered')::integer),
              'compatible', sum((entry ->> 'compatible')::integer),
              'percent', round(
                (sum((entry ->> 'compatible')::integer)::numeric /
                  nullif(sum((entry ->> 'answered')::integer), 0)) * 100
              )::integer
            )
            from facts f2
            cross join lateral jsonb_array_elements(f2.compatibility_questions) entry
            where entry ->> 'key' is not null
            group by entry ->> 'key'
            order by sum((entry ->> 'compatible')::integer) desc,
                     sum((entry ->> 'answered')::integer) desc,
                     entry ->> 'key' asc
            limit 1
          )
        )
      ),
      'seasonPlan', jsonb_build_object(
        'state', (select state from season_state),
        'year', (select season_year from season),
        'weddings', jsonb_build_object(
          'total', (select total from plan_counts),
          'completed', (select completed from plan_counts),
          'upcoming', (select upcoming from plan_counts)
        ),
        'guests', jsonb_build_object(
          'planned', (select planned_guests from plan_counts),
          'completed', (select sum(guests_total) from facts)
        ),
        'destinations', coalesce((
          select jsonb_agg(
            jsonb_build_object('country', country_code, 'planned', planned, 'completed', completed)
            order by (planned + completed) desc, country_code asc
          )
          from all_destinations where country_code is not null
        ), '[]'::jsonb)
      ),
      'nextWedding', (
        select jsonb_build_object(
          'city', venue_city,
          'country', venue_country,
          'month', extract(month from event_date)::integer,
          'year', extract(year from event_date)::integer,
          'daysUntil', greatest((event_date - current_date), 0)
        )
        from next_wedding
      )
    ) as payload
  )
  select
    payload || case
      when p_month is null then '{}'::jsonb
      else jsonb_build_object(
        'month', jsonb_build_object(
          'month', p_month,
          'year', (select season_year from season),
          'guests', jsonb_build_object(
            'total', (select sum(guests_total) from month_facts),
            'pl', (select sum(guests_pl) from month_facts),
            'fr', (select sum(guests_fr) from month_facts),
            'other', (select sum(guests_other) from month_facts)
          ),
          'compatibility', jsonb_build_object(
            'averagePercent', (
              select round(avg(compatibility_percent))::integer
              from month_facts where compatibility_percent is not null
            ),
            'answered', (select sum(compatibility_answered) from month_facts),
            'total', (select sum(compatibility_total) from month_facts),
            'weddings', (select count(*) from month_facts where compatibility_total is not null)
          ),
          'destinations', coalesce((
            select jsonb_agg(
              jsonb_build_object('country', country_code, 'weddings', completed)
              order by completed desc, country_code asc
            )
            from month_destinations
          ), '[]'::jsonb),
          'hasData', exists(select 1 from month_facts)
        )
      )
    end
  from base;
$$;

revoke all on function public.get_public_season_stats(integer, integer) from public;
grant execute on function public.get_public_season_stats(integer, integer) to anon, authenticated;
