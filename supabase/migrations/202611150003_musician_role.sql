-- Issue #992: per-musician joinable role and access.
-- Each active musician has its own PIN and QR link; access is revoked when the
-- musician is deactivated or deleted. The role is read-only on stage.

alter table public.wedding_roles drop constraint if exists wedding_roles_role_check;
alter table public.wedding_roles
  add constraint wedding_roles_role_check
  check (role in ('mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker', 'dj_mc', 'musician'));

alter table public.role_sessions drop constraint if exists role_sessions_role_check;
alter table public.role_sessions
  add constraint role_sessions_role_check
  check (role in ('mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker', 'dj_mc', 'musician'));

alter table public.role_presence drop constraint if exists role_presence_role_check;
alter table public.role_presence
  add constraint role_presence_role_check
  check (role in ('mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker', 'dj_mc', 'musician'));

alter table public.role_sessions add column if not exists musician_id uuid;
alter table public.role_presence add column if not exists musician_id uuid;

create table if not exists public.wedding_musician_access (
  musician_id uuid primary key references public.wedding_musicians(id) on delete cascade,
  wedding_id  text not null references public.weddings(wedding_id) on delete cascade,
  pin_hash    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists wedding_musician_access_wedding_idx
  on public.wedding_musician_access (wedding_id);

drop trigger if exists touch_wedding_musician_access on public.wedding_musician_access;
create trigger touch_wedding_musician_access
  before insert or update on public.wedding_musician_access
  for each row execute function public.touch_updated_at();

alter table public.wedding_musician_access enable row level security;
revoke all on public.wedding_musician_access from anon, authenticated;

drop policy if exists "room read" on public.live_sync_state;
create policy "room read"
  on public.live_sync_state for select
  to authenticated
  using (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in (
      'mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker', 'dj_mc', 'musician'
    )
    and public.current_session_active()
  );

drop policy if exists "wedding read" on public.weddings;
create policy "wedding read"
  on public.weddings for select
  to authenticated
  using (
    wedding_id = public.current_wedding_id()
    and public.current_app_role() in (
      'mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker', 'dj_mc', 'musician'
    )
    and public.current_session_active()
  );

create or replace function public.stage_deck_wedding()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  wid text := public.current_wedding_id();
  app_role text := public.current_app_role();
  wedding_row public.weddings%rowtype;
  cartridge jsonb;
begin
  if wid is null or app_role is null or not public.current_session_active() then
    return null;
  end if;
  if app_role not in (
    'mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker', 'dj_mc', 'musician'
  ) then
    return null;
  end if;

  select * into wedding_row
  from public.weddings
  where wedding_id = wid;

  if not found then
    return null;
  end if;

  cartridge := coalesce(wedding_row.cartridge, '{}'::jsonb);

  if app_role = 'speaker' then
    cartridge := jsonb_set(
      cartridge,
      '{speeches}',
      coalesce(
        (
          select jsonb_agg(speech)
          from jsonb_array_elements(coalesce(cartridge->'speeches', '[]'::jsonb)) as speech
          where case
            when jsonb_typeof(speech->'visibleToRoles') = 'array'
              then jsonb_array_length(speech->'visibleToRoles') = 0
                or speech->'visibleToRoles' ? 'speaker'
            else true
          end
        ),
        '[]'::jsonb
      )
    );
  elsif app_role not in ('mc', 'dj_mc') then
    cartridge := cartridge - 'speeches';
  end if;

  return jsonb_build_object(
    'wedding_id', wedding_row.wedding_id,
    'couple', wedding_row.couple,
    'date', wedding_row.date,
    'cartridge', cartridge,
    'updated_at', wedding_row.updated_at,
    'cartridge_revision', wedding_row.cartridge_revision,
    'cartridge_source', wedding_row.cartridge_source,
    'cartridge_published_at', wedding_row.cartridge_published_at
  );
end;
$$;
