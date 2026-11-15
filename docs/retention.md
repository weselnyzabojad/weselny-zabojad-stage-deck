# Data retention and purge schedule

The production database enforces the documented retention windows through
`public.stage_deck_purge_retention()` and a daily `pg_cron` job:

| Data | Retention | Owner |
| --- | --- | --- |
| Expired weddings + cascaded room/role/speech/game data | 30 days after `expires_at` | `stage_deck_purge_expired()` |
| Speech logs | 90 days | `stage_deck_purge_speech_logs()` |
| Game question logs | 90 days | `stage_deck_purge_game_question_logs()` |
| Admin audit log | 90 days | `stage_deck_purge_retention()` |
| Join attempts | 30 days | `stage_deck_purge_expired()` |
| Song request attempts | 30 days | `stage_deck_purge_retention()` |

## Schedule

`supabase/migrations/202611150004_retention_schedule.sql` schedules
`stage-deck-retention` at **04:15 UTC daily** via `pg_cron`.

```sql
select jobid, schedule, command, active
from cron.job
where jobname = 'stage-deck-retention';
```

## Monitoring

A missing or disabled job is detectable with the query above. Failed runs are
visible in `cron.job_run_details`:

```sql
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'stage-deck-retention')
order by start_time desc
limit 20;
```

Alert on repeated `failed` rows or on an absent/`active = false` job after
deployment. The purge function returns a JSON count summary; retain it in the
cron run details for auditing.
