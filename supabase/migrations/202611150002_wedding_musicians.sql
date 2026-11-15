-- Issue #990: owner-managed musician registry.
-- Musicians are admin-only data snapshotted into the published cartridge.
-- No anon or stage-role access; admin_api uses the service role.

create table if not exists public.wedding_musicians (
  id                uuid primary key default gen_random_uuid(),
  wedding_id        text not null references public.weddings(wedding_id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 120),
  instrument        text not null check (char_length(instrument) between 1 and 120),
  start_time        text check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_time          text check (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ceremony_required boolean not null default false,
  notes             text check (notes is null or char_length(notes) <= 500),
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint wedding_musicians_clock_pair
    check ((start_time is null) = (end_time is null)),
  constraint wedding_musicians_clock_distinct
    check (start_time is null or start_time <> end_time)
);

create index if not exists wedding_musicians_wedding_idx
  on public.wedding_musicians (wedding_id, active, created_at);

drop trigger if exists touch_wedding_musicians on public.wedding_musicians;
create trigger touch_wedding_musicians
  before insert or update on public.wedding_musicians
  for each row execute function public.touch_updated_at();

alter table public.wedding_musicians enable row level security;
revoke all on public.wedding_musicians from anon, authenticated;
