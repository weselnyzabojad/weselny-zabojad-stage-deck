-- Issue #1045: schedule retention purges.
-- The purge functions existed but nothing invoked them. This migration adds one
-- consolidated entry point and a daily pg_cron job. The job is idempotent and
-- safe to re-run; cron.job_run_details is the monitoring surface.

create extension if not exists pg_cron;

create or replace function public.stage_deck_purge_retention()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  weddings_removed integer := 0;
  speech_logs_removed integer := 0;
  game_logs_removed integer := 0;
  audit_removed integer := 0;
  song_attempts_removed integer := 0;
begin
  -- 30-day wedding TTL plus its cascaded state.
  weddings_removed := public.stage_deck_purge_expired();

  -- 90-day operational logs.
  speech_logs_removed := public.stage_deck_purge_speech_logs();
  game_logs_removed := public.stage_deck_purge_game_question_logs();

  delete from public.admin_audit_log
  where created_at < now() - interval '90 days';
  get diagnostics audit_removed = row_count;

  -- Rate-limit attempts are operational data; keep a 30-day window.
  delete from public.song_request_attempts
  where attempted_at < now() - interval '30 days';
  get diagnostics song_attempts_removed = row_count;

  return jsonb_build_object(
    'weddings', weddings_removed,
    'speechLogs', speech_logs_removed,
    'gameLogs', game_logs_removed,
    'adminAudit', audit_removed,
    'songRequestAttempts', song_attempts_removed,
    'ranAt', now()
  );
end $$;

revoke all on function public.stage_deck_purge_retention()
  from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'stage-deck-retention') then
    perform cron.unschedule('stage-deck-retention');
  end if;

  perform cron.schedule(
    'stage-deck-retention',
    '15 4 * * *',
    $cron$select public.stage_deck_purge_retention()$cron$
  );
end $$;
