import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSeasonFact, resolveEventMonth } from '../supabase/functions/_shared/seasonFacts.js';
import { fetchSeasonStats } from '../src/lib/seasonStats.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/202611210003_season_month_aggregates.sql');

const config = { enabled: true, url: 'https://example.test', anonKey: 'anon' };

describe('issue #1345 durable monthly season aggregates', () => {
  it('adds and backfills the nullable event_month', () => {
    expect(migration).toContain('add column if not exists event_month smallint');
    expect(migration).toContain('event_month between 1 and 12');
    expect(migration).toContain('set event_month = source.event_month');
    expect(migration).toContain("w.cartridge -> 'extensions' ->> 'dateISO'");
  });

  it('writes event_month on every season fact', async () => {
    const fact = await buildSeasonFact({
      wedding: {
        wedding_id: 'W-UM-2026-08-001',
        cartridge: { extensions: { dateISO: '2026-08-20' } },
        venue_country: 'PL',
      },
      recap: { summary: {}, games: [], ceremony: [] },
      now: new Date('2026-11-21T00:00:00Z'),
    });
    expect(fact).toMatchObject({ season_year: 2026, event_month: 8 });
    expect(resolveEventMonth({ wedding: { date: '20.08.2026' } })).toBe(8);
  });

  it('exposes an optional month block without changing the base payload', () => {
    expect(migration).toContain('p_month integer default null');
    expect(migration).toContain('month_facts as');
    expect(migration).toContain("'month', jsonb_build_object(");
    expect(migration).toContain("when p_month is null then '{}'::jsonb");
    expect(migration).toContain("'hasData', exists(select 1 from month_facts)");
    expect(migration).toContain("'averagePercent'");
    expect(migration).toContain('compatibility_answered');
  });

  it('scopes nextWedding to the season and exposes daysUntil only', () => {
    expect(migration).toContain('join season s on extract(year from candidate.event_date)::integer = s.season_year');
    expect(migration).toContain("'daysUntil', greatest((event_date - current_date), 0)");
    expect(migration).not.toContain("'eventDate'");
    expect(migration).not.toContain("'couple'");
    expect(migration).not.toContain("'venueName'");
    expect(migration).not.toContain("'address'");
  });

  it('sends p_month only when a month is requested', async () => {
    const calls = [];
    const fetchImpl = async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({}) };
    };
    await fetchSeasonStats({ config, fetchImpl, seasonYear: 2026 });
    await fetchSeasonStats({ config, fetchImpl, seasonYear: 2026, month: 8 });
    expect(calls[0]).toEqual({ p_season_year: 2026 });
    expect(calls[1]).toEqual({ p_season_year: 2026, p_month: 8 });
  });
});
