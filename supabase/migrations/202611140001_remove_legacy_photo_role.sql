-- Issue #875: remove the legacy `photo` role from constraints, policies and
-- the role-projected cartridge function. Canonical roles are mc, dj, photo1,
-- photo2, video, venue_manager and speaker. Old `photo` links/roles normalize
-- to `photo1` in the client before join.

alter table public.wedding_roles drop constraint if exists wedding_roles_role_check;
alter table public.wedding_roles
  add constraint wedding_roles_role_check
  check (role in ('mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'));

alter table public.role_sessions drop constraint if exists role_sessions_role_check;
alter table public.role_sessions
  add constraint role_sessions_role_check
  check (role in ('mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'));

alter table public.role_presence drop constraint if exists role_presence_role_check;
alter table public.role_presence
  add constraint role_presence_role_check
  check (role in ('mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'));

drop policy if exists "room read" on public.live_sync_state;
create policy "room read"
  on public.live_sync_state for select
  to authenticated
  using (
    wedding_id = 'wzsd:' || public.current_wedding_id()
    and public.current_app_role() in (
      'mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'
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
      'mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'
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
    'mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'
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
  elsif app_role <> 'mc' then
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
