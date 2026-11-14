-- Issue #852: pin search_path on the helper functions used by RLS and triggers.

create or replace function public.current_session_jti()
returns uuid
language sql
stable
set search_path = public, pg_temp
as $$ select nullif(auth.jwt() ->> 'jti', '')::uuid; $$;

create or replace function public.current_wedding_id()
returns text
language sql
stable
set search_path = public, pg_temp
as $$ select nullif(auth.jwt() ->> 'wedding_id', ''); $$;

create or replace function public.current_app_role()
returns text
language sql
stable
set search_path = public, pg_temp
as $$ select nullif(auth.jwt() ->> 'app_role', ''); $$;

create or replace function public.stage_deck_server_time()
returns timestamptz
language sql
stable
set search_path = public, pg_temp
as $$ select now(); $$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
