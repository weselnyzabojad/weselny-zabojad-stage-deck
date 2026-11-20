import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildSeasonFact,
  isStoLatEnabled,
  resolveSeasonYear,
} from '../supabase/functions/_shared/seasonFacts.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const wedding = {
  wedding_id: 'Anna&Piotr-UM-2026-08-001',
  date: '20.08.2026',
  venue_country: 'PL',
  cartridge: {
    extensions: { dateISO: '2026-08-20' },
    demographics: { total: 100, pl: 50, fr: 40, other: 10 },
    culturalRules: { sto_lat: { status: 'ON_REQUEST' } },
    oczepiny: {
      enabled: true,
      subEvents: [{ id: 'veil_toss', title: 'Veil toss' }],
    },
  },
};

const recap = {
  wedding: { id: wedding.wedding_id, date: '20.08.2026', dateISO: '2026-08-20' },
  summary: { gameCount: 1, ceremonyPartCount: 2 },
  games: [{ id: 'g1' }, { id: 'g2' }],
  ceremony: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
};

const recapId = '00000000-0000-4000-8000-000000000001';

describe('issue #1215 durable season facts', () => {
  it('builds one anonymized fact from the wedding, recap and venue fields', async () => {
    const fact = await buildSeasonFact({ wedding, recap, recapId });
    expect(fact.wedding_key).toMatch(/^[0-9a-f]{64}$/);
    expect(fact.wedding_key).not.toContain('Anna');
    expect(fact.season_year).toBe(2026);
    expect(fact.source_recap_id).toBe(recapId);
    expect(fact.guests_total).toBe(100);
    expect(fact.guests_pl).toBe(50);
    expect(fact.guests_fr).toBe(40);
    expect(fact.guests_other).toBe(10);
    expect(fact.country_code).toBe('PL');
    expect(fact.stolat_enabled).toBe(true);
    expect(fact.games_count).toBe(2);
    expect(fact.ceremony_parts).toBe(3);
    expect(fact.oczepiny_parts).toBe(1);
    expect(fact.animations_total).toBe(6);
  });

  it('derives the same wedding key for the same wedding and never exposes an id', async () => {
    const first = await buildSeasonFact({ wedding, recap, recapId });
    const second = await buildSeasonFact({ wedding, recap, recapId });
    expect(first.wedding_key).toBe(second.wedding_key);
  });

  it('normalizes Sto Lat counting to YES + ON_REQUEST', () => {
    expect(isStoLatEnabled('YES')).toBe(true);
    expect(isStoLatEnabled('ON_REQUEST')).toBe(true);
    expect(isStoLatEnabled('ON REQUEST')).toBe(true);
    expect(isStoLatEnabled('NO')).toBe(false);
    expect(isStoLatEnabled('STRICT_NO')).toBe(false);
    expect(isStoLatEnabled('YES_EXPLAIN')).toBe(false);
    expect(isStoLatEnabled(null)).toBe(false);
  });

  it('uses the event year with a publish-year fallback on boundaries', () => {
    const now = new Date('2026-11-18T12:00:00Z');
    expect(resolveSeasonYear({ wedding, recap, now })).toBe(2026);
    expect(
      resolveSeasonYear({
        wedding: { cartridge: { extensions: { dateISO: '2026-12-31' } } },
        now,
      }),
    ).toBe(2026);
    expect(
      resolveSeasonYear({
        wedding: { cartridge: { extensions: { dateISO: '2027-01-01' } } },
        now,
      }),
    ).toBe(2027);
    expect(resolveSeasonYear({ wedding: { date: '31.12.2027' }, now })).toBe(2027);
    expect(resolveSeasonYear({ wedding: {}, now })).toBe(2026);
    expect(
      resolveSeasonYear({
        wedding: { cartridge: { extensions: { dateISO: '2026-02-31' } } },
        now,
      }),
    ).toBe(2026);
  });

  it('keeps missing values null instead of fake zeros', async () => {
    const fact = await buildSeasonFact({
      wedding: {
        wedding_id: 'W-empty',
        date: '20.08.2026',
        venue_country: null,
        cartridge: { extensions: { dateISO: '2026-08-20' } },
      },
      recap: { summary: {}, games: [], ceremony: [] },
      recapId,
    });
    expect(fact.guests_total).toBeNull();
    expect(fact.guests_pl).toBeNull();
    expect(fact.country_code).toBeNull();
    expect(fact.stolat_enabled).toBe(false);
    expect(fact.games_count).toBe(0);
    expect(fact.ceremony_parts).toBe(0);
    expect(fact.oczepiny_parts).toBeNull();
    expect(fact.animations_total).toBeNull();
  });

  it('treats disabled Oczepiny as a real zero', async () => {
    const fact = await buildSeasonFact({
      wedding: {
        ...wedding,
        cartridge: {
          ...wedding.cartridge,
          oczepiny: { enabled: false, subEvents: [{ id: 'x' }] },
        },
      },
      recap,
      recapId,
    });
    expect(fact.oczepiny_parts).toBe(0);
  });

  it('publishes the fact after a recap and upserts by wedding key', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("import { buildSeasonFact } from '../_shared/seasonFacts.js';");
    expect(api).toContain('buildSeasonFact({');
    expect(api).toContain("from('season_event_facts')");
    expect(api).toContain("upsert(seasonFact, { onConflict: 'wedding_key' })");
    expect(api).toContain('venue_country');
  });

  it('defines a closed table and a public aggregate-only RPC', () => {
    const sql = read('supabase/migrations/202611180002_season_event_facts.sql');
    for (const column of [
      'wedding_key',
      'season_year',
      'source_recap_id',
      'guests_total',
      'guests_pl',
      'guests_fr',
      'guests_other',
      'country_code',
      'stolat_enabled',
      'games_count',
      'ceremony_parts',
      'oczepiny_parts',
      'animations_total',
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('revoke all on public.season_event_facts from public, anon, authenticated');
    expect(sql).not.toContain('create policy');
    expect(sql).toContain('get_public_season_stats');
    expect(sql).toContain('security definer');
    expect(sql).toContain('set search_path = public');
    expect(sql).toContain('grant execute on function public.get_public_season_stats(integer) to anon, authenticated');
    expect(sql).toContain('on conflict (wedding_key) do nothing');
  });

  it('keeps the RPC aggregate-only and nextWedding privacy-safe', () => {
    const sql = read('supabase/migrations/202611180002_season_event_facts.sql');
    const rpc = sql.slice(sql.indexOf('create or replace function public.get_public_season_stats'));
    for (const key of [
      "'seasonYear'",
      "'generatedAt'",
      "'hasData'",
      "'coverage'",
      "'kpis'",
      "'guests'",
      "'destinations'",
      "'stolatWeddings'",
      "'animations'",
      "'nextWedding'",
      "'city'",
      "'country'",
      "'month'",
      "'year'",
    ]) {
      expect(rpc).toContain(key);
    }
    expect(rpc).not.toContain('venue_name');
    expect(rpc).not.toContain('venue_address');
    expect(rpc).not.toContain('wedding_id');
    expect(rpc).not.toContain('couple');
    expect(rpc).toContain('w.archived_at is null');
    expect(rpc).toContain("w.venue_country ~ '^[A-Z]{2}$'");
    expect(rpc).toContain('candidate.event_date >= current_date');
  });
});
