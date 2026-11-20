-- Issue #1212: admin-managed venue location for each wedding.
-- The public season stats only ever read `venue_country`; address and city stay
-- admin-only. Country is nullable when the location cannot be resolved.

alter table public.weddings
  add column if not exists venue_name text
    check (venue_name is null or char_length(venue_name) between 1 and 160),
  add column if not exists venue_address text
    check (venue_address is null or char_length(venue_address) between 1 and 240),
  add column if not exists venue_city text
    check (venue_city is null or char_length(venue_city) between 1 and 120),
  add column if not exists venue_country text
    check (venue_country is null or venue_country ~ '^[A-Z]{2}$');

-- Legacy cartridges stored the venue name and address under `venueDetails`.
-- Country is only copied when it is already a valid uppercase two-letter code;
-- nothing is inferred from the couple or the city here.
update public.weddings
set
  venue_name = coalesce(
    venue_name,
    nullif(trim(cartridge -> 'venueDetails' ->> 'venue'), ''),
    nullif(trim(cartridge -> 'venueDetails' ->> 'name'), '')
  ),
  venue_address = coalesce(
    venue_address,
    nullif(trim(cartridge -> 'venueDetails' ->> 'address'), '')
  ),
  venue_country = coalesce(
    venue_country,
    case
      when upper(trim(cartridge -> 'venueDetails' ->> 'country')) ~ '^[A-Z]{2}$'
        then upper(trim(cartridge -> 'venueDetails' ->> 'country'))
      else null
    end
  )
where cartridge -> 'venueDetails' is not null
  and (
    venue_name is null
    or venue_address is null
    or venue_country is null
  );
