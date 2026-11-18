import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyPortfolioFilters,
  buildPortfolioKpis,
} from '../supabase/functions/_shared/portfolioKpis.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const now = new Date('2026-11-18T12:00:00.000Z');

function portfolioAction() {
  const api = read('supabase/functions/admin_api/index.ts');
  const start = api.indexOf("action === 'portfolio_kpis'");
  return api.slice(start, api.indexOf("if (action === 'list')", start));
}

function wedding(id, overrides = {}) {
  return {
    wedding_id: id,
    couple: `Couple ${id}`,
    date: '20.08.2026',
    archived_at: null,
    expires_at: '2026-12-31T00:00:00.000Z',
    updated_at: '2026-08-21T00:00:00.000Z',
    cartridge: {
      servicePackage: 'HOST_AND_DJ_VIP',
      extensions: { dateISO: '2026-08-20', languages: { supported: ['PL', 'FR'] } },
      steps: [
        { id: 'a', time: '18:00' },
        { id: 'b', time: '19:00' },
      ],
    },
    ...overrides,
  };
}

const recap = {
  summary: { totalSteps: 4, completedSteps: 3, scheduleChangeCount: 2 },
  timeline: [
    { actualStart: '18:05', driftMinutes: 5 },
    { actualStart: '19:10', driftMinutes: 10 },
    { actualStart: '20:00', driftMinutes: 0 },
  ],
  games: [
    {
      questions: [
        { isCompatible: true },
        { isCompatible: false },
      ],
    },
  ],
};

describe('issue #1210 portfolio KPI data layer', () => {
  it('returns an empty portfolio safely', () => {
    const result = buildPortfolioKpis({ weddings: [], now });
    expect(result.weddings).toEqual([]);
    expect(result.portfolio.totals.all).toBe(0);
    expect(result.portfolio.averageOnTimePct).toBeNull();
    expect(result.portfolio.coverage.quality).toBe(0);
  });

  it('prefers the recap summary and exposes coverage', () => {
    const result = buildPortfolioKpis({
      weddings: [wedding('w1')],
      recaps: { w1: { payload: recap } },
      requests: {
        w1: [
          { status: 'accepted', played_at: '2026-08-20T20:00:00.000Z' },
          { status: 'accepted', played_at: null },
          { status: 'pending', played_at: null },
        ],
      },
      roles: { w1: ['mc', 'dj'] },
      now,
    });
    const row = result.weddings[0];
    expect(row.dataQuality).toBe('recap');
    expect(row.completionPct).toBe(75);
    expect(row.onTimePct).toBe(67);
    expect(row.biggestDelayMinutes).toBe(10);
    expect(row.scheduleChangeCount).toBe(2);
    expect(row.requestsTotal).toBe(3);
    expect(row.requestsAccepted).toBe(2);
    expect(row.requestsPlayed).toBe(1);
    expect(row.compatibilityPct).toBe(50);
    expect(row.recapPublished).toBe(true);
    expect(row.roles).toEqual(['mc', 'dj']);
    expect(result.portfolio.coverage.withRecap).toBe(1);
  });

  it('falls back to live state when no recap exists', () => {
    const result = buildPortfolioKpis({
      weddings: [wedding('w2')],
      liveStates: {
        w2: {
          active_step_id: 'b',
          step_order: ['a', 'b'],
          completed_step_ids: ['a'],
          actual_timestamps: { a: '18:10', b: '19:00' },
          game_results: {},
        },
      },
      now,
    });
    const row = result.weddings[0];
    expect(row.dataQuality).toBe('live');
    expect(row.completedSteps).toBe(1);
    expect(row.completionPct).toBe(50);
    expect(row.onTimePct).toBe(50);
    expect(row.eventComplete).toBe(false);
  });

  it('includes archived rows but excludes them from quality averages', () => {
    const result = buildPortfolioKpis({
      weddings: [
        wedding('active'),
        wedding('archived', {
          archived_at: '2026-08-22T00:00:00.000Z',
        }),
      ],
      recaps: {
        active: { payload: recap },
        archived: { payload: { ...recap, summary: { totalSteps: 4, completedSteps: 4 } } },
      },
      now,
    });
    expect(result.portfolio.totals.all).toBe(2);
    expect(result.portfolio.totals.archived).toBe(1);
    expect(result.portfolio.coverage.quality).toBe(1);
    // The archived 100% completion must not raise the active 75% average.
    expect(result.portfolio.averageCompletionPct).toBe(75);
  });

  it('applies year, status, package and language filters', () => {
    const rows = [
      buildPortfolioKpis({ weddings: [wedding('w1')], now }).weddings[0],
      buildPortfolioKpis({
        weddings: [
          wedding('w2', {
            archived_at: '2026-08-22T00:00:00.000Z',
            cartridge: {
              servicePackage: 'HOST_ONLY',
              extensions: { dateISO: '2025-07-01', languages: { supported: ['EN'] } },
              steps: [],
            },
          }),
        ],
        now,
      }).weddings[0],
    ];
    expect(applyPortfolioFilters(rows, { year: '2026' }).map((row) => row.id)).toEqual(['w1']);
    expect(applyPortfolioFilters(rows, { status: 'archived' }).map((row) => row.id)).toEqual([
      'w2',
    ]);
    expect(applyPortfolioFilters(rows, { package: 'HOST_ONLY' }).map((row) => row.id)).toEqual([
      'w2',
    ]);
    expect(applyPortfolioFilters(rows, { language: 'fr' }).map((row) => row.id)).toEqual(['w1']);
  });

  it('returns null metrics with coverage instead of fake zeros', () => {
    const result = buildPortfolioKpis({
      weddings: [
        wedding('empty', {
          cartridge: { servicePackage: null, extensions: {}, steps: [] },
        }),
      ],
      now,
    });
    const row = result.weddings[0];
    expect(row.dataQuality).toBe('none');
    expect(row.completionPct).toBeNull();
    expect(row.onTimePct).toBeNull();
    expect(row.compatibilityPct).toBeNull();
    expect(result.portfolio.coverage.withTiming).toBe(0);
    expect(result.portfolio.readiness).toMatchObject({
      missing_languages: 1,
      missing_steps: 1,
      recap_not_published: 1,
      missing_actuals: 1,
    });
  });

  it('reads ISO actual timestamps written by the live stage', () => {
    const result = buildPortfolioKpis({
      weddings: [wedding('w3')],
      liveStates: {
        w3: {
          active_step_id: 'b',
          step_order: ['a', 'b'],
          completed_step_ids: ['a'],
          actual_timestamps: {
            a: '2026-08-20T18:10:00.000Z',
            b: '2026-08-20T19:00:00+02:00',
          },
        },
      },
      now,
    });
    expect(result.weddings[0].onTimePct).toBe(50);
    expect(result.weddings[0].biggestDelayMinutes).toBe(10);
  });

  it('counts expired weddings but keeps them out of quality averages', () => {
    const result = buildPortfolioKpis({
      weddings: [
        wedding('current'),
        wedding('expired', { expires_at: '2026-10-01T00:00:00.000Z' }),
      ],
      recaps: {
        current: { payload: recap },
        expired: { payload: { ...recap, summary: { totalSteps: 4, completedSteps: 4 } } },
      },
      now,
    });
    expect(result.portfolio.totals.expired).toBe(1);
    expect(result.portfolio.totals.active).toBe(1);
    expect(result.portfolio.coverage.quality).toBe(1);
    expect(result.portfolio.averageCompletionPct).toBe(75);
  });

  it('falls back to live state for a legacy recap without a summary', () => {
    const result = buildPortfolioKpis({
      weddings: [wedding('legacy')],
      liveStates: {
        legacy: {
          step_order: ['a', 'b'],
          completed_step_ids: ['a'],
          actual_timestamps: { a: '18:02' },
        },
      },
      recaps: { legacy: { payload: { wedding: { couple: 'Legacy' } } } },
      now,
    });
    const row = result.weddings[0];
    expect(row.dataQuality).toBe('recap');
    expect(row.totalSteps).toBe(2);
    expect(row.completedSteps).toBe(1);
    expect(row.completionPct).toBe(50);
    expect(row.onTimePct).toBe(100);
  });

  it('does not expose PII and is wired into admin_api', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("action === 'portfolio_kpis'");
    expect(api).toContain('buildPortfolioKpis');
    const block = portfolioAction();
    expect(block).not.toContain("select('*')");
    for (const field of ['device_id', 'pin_hash', 'contacts', 'notes', 'mutation_log']) {
      expect(block).not.toContain(field);
    }
  });
});
