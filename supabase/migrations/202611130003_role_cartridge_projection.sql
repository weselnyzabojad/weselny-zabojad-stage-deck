-- Issue #848: do not expose the raw cartridge to every stage role.
-- Role tokens use this RPC; direct SELECT of weddings.cartridge is removed.

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
    'mc', 'dj', 'photo', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'
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

revoke all on function public.stage_deck_wedding() from public, anon;
grant execute on function public.stage_deck_wedding() to authenticated;

revoke select on public.weddings from authenticated;
grant select (
  wedding_id,
  room_code,
  couple,
  date,
  expires_at,
  archived_at,
  created_at,
  updated_at,
  cartridge_revision,
  cartridge_source,
  cartridge_source_metadata,
  cartridge_published_at
) on public.weddings to authenticated;
