-- Issue #914: admin-managed VIP DJ registry.
-- The registry is the only source of VIP identities; providers reference it by
-- id. Public/anon clients have no table access; admin_api uses the service role.

create table if not exists public.vip_djs (
  id                      text primary key,
  display_name            text not null,
  phone                   text,
  instagram               text,
  logo_url                text,
  package_default         text,
  sort_order              integer not null default 0,
  active                  boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint vip_djs_id_format check (id ~ '^[a-z0-9_]{3,40}$'),
  constraint vip_djs_package_default check (
    package_default is null or package_default in ('HOST_AND_DJ_VIP', 'DJ_MC')
  )
);

alter table public.vip_djs enable row level security;
revoke all on table public.vip_djs from anon, authenticated;

insert into public.vip_djs (id, display_name, phone, instagram, logo_url, package_default, sort_order, active)
values
  ('dj_mark', 'DJ Mark', null, null, '/assets/img/dj-vip/logo_mark.png', 'HOST_AND_DJ_VIP', 1, true),
  ('dj_szymoniak', 'DJ Szymoniak', null, null, '/assets/img/dj-vip/logo_szymoniak.png', null, 2, true)
on conflict (id) do nothing;

-- Replace the hardcoded VIP id check with a real foreign key.
alter table public.wedding_service_providers
  drop constraint if exists wedding_service_providers_vip_dj_check;

alter table public.wedding_service_providers
  add constraint wedding_service_providers_vip_dj_fk
  foreign key (vip_dj_id) references public.vip_djs(id)
  on update cascade on delete restrict;
