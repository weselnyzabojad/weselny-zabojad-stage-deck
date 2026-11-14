-- DJ identity assignment reference. The VIP identity data itself lives in
-- source-controlled code (src/lib/vipDjs.js); only the stable id is stored.
alter table public.wedding_service_providers
  add column if not exists vip_dj_id text;

alter table public.wedding_service_providers
  drop constraint if exists wedding_service_providers_vip_dj_check;
alter table public.wedding_service_providers
  add constraint wedding_service_providers_vip_dj_check
  check (
    vip_dj_id is null
    or (category = 'dj' and vip_dj_id in ('dj_mark', 'dj_szymoniak'))
  );
