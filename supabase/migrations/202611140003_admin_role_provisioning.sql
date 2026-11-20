-- Issue #876: backend for per-wedding admin role management.
-- Adds the MC confirmation state and the mc/dj_mc provider categories.

alter table public.weddings
  add column if not exists mc_confirmed_by text
  check (mc_confirmed_by in ('OWNER', 'PROVIDER'));

alter table public.wedding_service_providers
  drop constraint if exists wedding_service_providers_category_check;
alter table public.wedding_service_providers
  add constraint wedding_service_providers_category_check
  check (category in ('dj', 'photo1', 'photo2', 'video', 'venue_manager', 'mc', 'dj_mc', 'other'));

alter table public.wedding_service_providers
  drop constraint if exists wedding_service_providers_vip_dj_check;
alter table public.wedding_service_providers
  add constraint wedding_service_providers_vip_dj_check
  check (vip_dj_id is null or (category in ('dj', 'dj_mc') and vip_dj_id in ('dj_mark', 'dj_szymoniak')));

create unique index if not exists wedding_service_providers_role_unique_idx
  on public.wedding_service_providers (wedding_id, category)
  where category in ('dj', 'photo1', 'photo2', 'video', 'venue_manager', 'mc', 'dj_mc');
