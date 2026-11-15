-- Issue #1048: atomic revision allocation.
-- Read-then-insert allocation could give two concurrent admins the same
-- revision. These helpers serialise allocation per wedding (and per game type)
-- with a transaction-scoped advisory lock, then return the next integer.

create or replace function public.stage_deck_next_speech_revision(p_wedding_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_revision integer;
begin
  perform pg_advisory_xact_lock(hashtext('speech:' || p_wedding_id));
  select coalesce(max(revision), 0) + 1
    into next_revision
    from public.speech_revisions
    where wedding_id = p_wedding_id;
  return next_revision;
end $$;

create or replace function public.stage_deck_next_game_revision(
  p_wedding_id text,
  p_game_type text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_revision integer;
begin
  perform pg_advisory_xact_lock(hashtext('game:' || p_wedding_id || ':' || p_game_type));
  select coalesce(max(revision), 0) + 1
    into next_revision
    from public.game_question_revisions
    where wedding_id = p_wedding_id and game_type = p_game_type;
  return next_revision;
end $$;

revoke all on function public.stage_deck_next_speech_revision(text)
  from public, anon, authenticated;
revoke all on function public.stage_deck_next_game_revision(text, text)
  from public, anon, authenticated;
