-- Owner-admin service provider registry. Admin-only data: no anon or stage role
-- access, and never part of the cartridge or live state.

create table if not exists public.wedding_service_providers (
  id             uuid primary key default gen_random_uuid(),
  wedding_id     text not null references public.weddings(wedding_id) on delete cascade,
  category       text not null check (category in ('dj', 'photo1', 'photo2', 'video', 'venue_manager', 'other')),
  function_label text,
  first_name     text not null check (char_length(first_name) between 1 and 120),
  last_name      text not null check (char_length(last_name) between 1 and 120),
  phone          text,
  email          text,
  address        text,
  instagram      text,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint wedding_service_providers_other_function
    check (category <> 'other' or (function_label is not null and char_length(function_label) between 1 and 120))
);

create unique index if not exists wedding_service_providers_role_unique_idx
  on public.wedding_service_providers (wedding_id, category)
  where category in ('dj', 'photo1', 'photo2', 'video', 'venue_manager');

create index if not exists wedding_service_providers_wedding_idx
  on public.wedding_service_providers (wedding_id, category, created_at);

drop trigger if exists touch_wedding_service_providers on public.wedding_service_providers;
create trigger touch_wedding_service_providers
  before insert or update on public.wedding_service_providers
  for each row execute function public.touch_updated_at();

alter table public.wedding_service_providers enable row level security;

-- Service-role (admin_api) access only.
revoke all on public.wedding_service_providers from anon, authenticated;
