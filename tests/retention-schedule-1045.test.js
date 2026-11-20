import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1045 retention purge schedule', () => {
  it('schedules the consolidated retention function with pg_cron', () => {
    const sql = read('supabase/migrations/202611150004_retention_schedule.sql');
    expect(sql).toContain('create extension if not exists pg_cron');
    expect(sql).toContain('stage_deck_purge_retention');
    expect(sql).toContain("cron.schedule(");
    expect(sql).toContain("'stage-deck-retention'");
    expect(sql).toContain("'15 4 * * *'");
  });

  it('covers weddings, logs and rate-limit tables', () => {
    const sql = read('supabase/migrations/202611150004_retention_schedule.sql');
    expect(sql).toContain('stage_deck_purge_expired');
    expect(sql).toContain('stage_deck_purge_speech_logs');
    expect(sql).toContain('stage_deck_purge_game_question_logs');
    expect(sql).toContain('admin_audit_log');
    expect(sql).toContain('song_request_attempts');
    expect(sql).toContain("interval '90 days'");
    expect(sql).toContain("interval '30 days'");
  });

  it('documents the schedule and failure monitoring', () => {
    const docs = read('docs/retention.md');
    expect(docs).toContain('cron.job');
    expect(docs).toContain('cron.job_run_details');
    expect(docs).toContain('04:15 UTC');
    expect(docs).toContain('30 days');
    expect(docs).toContain('90 days');
  });
});
