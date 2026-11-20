import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const sql = read('supabase/migrations/202611180003_season_plan_rpc.sql');

describe('issue #1245 planned season aggregates RPC', () => {
  it('extends the public RPC without adding a table or column', () => {
    expect(sql).toContain('create or replace function public.get_public_season_stats');
    expect(sql).not.toContain('create table');
    expect(sql).not.toContain('alter table');
    expect(sql).toContain('grant execute on function public.get_public_season_stats(integer) to anon, authenticated');
  });

  it('returns a seasonPlan with the four states', () => {
    expect(sql).toContain("'seasonPlan'");
    expect(sql).toContain("'state'");
    for (const state of ["'pre'", "'live'", "'post'", "'none'"]) {
      expect(sql).toContain(state);
    }
    expect(sql).toContain("'weddings'");
    expect(sql).toContain("'completed'");
    expect(sql).toContain("'upcoming'");
    expect(sql).toContain("'guests'");
    expect(sql).toContain("'planned'");
    expect(sql).toContain("'destinations'");
  });

  it('uses calendar-year event dates and treats today as upcoming', () => {
    expect(sql).toContain("w.cartridge -> 'extensions' ->> 'dateISO'");
    expect(sql).toContain('extract(year from candidate.event_date)');
    expect(sql).toContain('event_date < current_date');
    expect(sql).toContain('event_date >= current_date');
    expect(sql).toContain('w.archived_at is null');
  });

  it('reads planned guests and countries from real stored data', () => {
    expect(sql).toContain("w.cartridge -> 'demographics' ->> 'total'");
    expect(sql).toContain('w.venue_country');
    expect(sql).toContain('season_event_facts');
    expect(sql).toContain('planned_guests');
    expect(sql).toContain('planned_destinations');
  });

  it('keeps the existing public payload compatible', () => {
    for (const key of ["'seasonYear'", "'generatedAt'", "'hasData'", "'coverage'", "'kpis'", "'nextWedding'"]) {
      expect(sql).toContain(key);
    }
  });

  it('exposes only aggregates, not per-wedding identity or addresses', () => {
    expect(sql).not.toContain("'wedding_id'");
    expect(sql).not.toContain("'couple'");
    expect(sql).not.toContain("'venue_name'");
    expect(sql).not.toContain("'venue_address'");
    expect(sql).not.toContain("'date'");
    expect(sql).toContain('security definer');
    expect(sql).toContain('set search_path = public');
  });
});
