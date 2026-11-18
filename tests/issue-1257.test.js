import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSeasonFact } from '../supabase/functions/_shared/seasonFacts.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/202611180004_season_compatibility.sql');

const wedding = {
  wedding_id: 'Jennifer&Guillaume-UM-2026-08-001',
  date: '20.08.2026',
  venue_country: 'PL',
  cartridge: {
    extensions: { dateISO: '2026-08-20' },
    culturalRules: { sto_lat: { status: 'YES' } },
  },
};

const recap = {
  summary: { gameCount: 1 },
  games: [
    {
      id: 'g1',
      questions: [
        { id: 'q1', isCompatible: true },
        { id: 'q2', isCompatible: false },
        { id: 'q3', isCompatible: true },
        { id: 'q4' },
      ],
    },
  ],
};

describe('issue #1257 durable season compatibility aggregates', () => {
  it('computes answered, total, percent and a bounded question summary', async () => {
    const fact = await buildSeasonFact({
      wedding,
      recap,
      recapId: '00000000-0000-4000-8000-000000000001',
    });
    expect(fact.compatibility_total).toBe(4);
    expect(fact.compatibility_answered).toBe(3);
    expect(fact.compatibility_percent).toBe(67);
    expect(fact.compatibility_questions).toEqual([
      { key: 'q:q1', answered: 1, compatible: 1 },
      { key: 'q:q2', answered: 1, compatible: 0 },
      { key: 'q:q3', answered: 1, compatible: 1 },
    ]);
    expect(JSON.stringify(fact)).not.toContain('Jennifer');
    expect(JSON.stringify(fact)).not.toContain('Guillaume');
  });

  it('keeps missing compatibility null instead of zero percent', async () => {
    const fact = await buildSeasonFact({
      wedding,
      recap: { summary: { gameCount: 1 }, games: [{ id: 'g1' }] },
    });
    expect(fact.compatibility_total).toBe(0);
    expect(fact.compatibility_answered).toBe(0);
    expect(fact.compatibility_percent).toBeNull();
    expect(fact.compatibility_questions).toEqual([]);
  });

  it('bounds the per-question summary to 20 entries', async () => {
    const questions = Array.from({ length: 30 }, (_, index) => ({
      id: `q${index}`,
      isCompatible: index % 2 === 0,
    }));
    const fact = await buildSeasonFact({
      wedding,
      recap: { games: [{ id: 'g1', questions }] },
    });
    expect(fact.compatibility_questions).toHaveLength(20);
    expect(fact.compatibility_answered).toBe(30);
  });

  it('ships an additive, idempotent migration and the public RPC fields', () => {
    expect(migration).toContain('add column if not exists compatibility_total');
    expect(migration).toContain('add column if not exists compatibility_answered');
    expect(migration).toContain('add column if not exists compatibility_percent');
    expect(migration).toContain("add column if not exists compatibility_questions jsonb not null default '[]'::jsonb");
    expect(migration).toContain('create or replace function public.get_public_season_stats');
    expect(migration).toContain("'compatibility', jsonb_build_object(");
    expect(migration).toContain("'averagePercent'");
    expect(migration).toContain("'topQuestion'");
    expect(migration).toContain("grant execute on function public.get_public_season_stats(integer) to anon, authenticated");
  });

  it('backfills only while recaps still exist and never writes identity', () => {
    expect(migration).toContain('where r.revoked_at is null');
    expect(migration).toContain('and r.expires_at > now()');
    expect(migration).toContain('and f.compatibility_total is null');
    expect(migration).not.toContain('speaker_name');
    expect(migration).not.toContain('venue_name');
    expect(migration).not.toContain('couple_id');
  });
});
