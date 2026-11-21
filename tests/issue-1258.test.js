import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SeasonStory from '../src/components/social/SeasonStory.jsx';
import {
  buildSeasonModel,
  seasonCaptionLines,
} from '../src/lib/socialSeason.js';
import { fetchSeasonStats } from '../src/lib/seasonStats.js';
import { templatesForSurface } from '../src/lib/socialStory.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const data = {
  seasonYear: 2026,
  hasData: true,
  coverage: { weddings: 12 },
  seasonPlan: {
    state: 'post',
    weddings: { total: 14, completed: 12 },
    guests: { planned: 1600, completed: 1400 },
  },
  kpis: {
    guests: { total: 1400 },
    destinations: [{ country: 'PL' }, { country: 'FR' }],
    compatibility: {
      averagePercent: 76,
      answered: 240,
      total: 300,
      weddings: 12,
      topQuestion: { key: 'q:q1', answered: 60, compatible: 54, percent: 90 },
    },
  },
};

describe('issue #1258 season Test Zgodności template', () => {
  it('builds the season model from the public aggregate', () => {
    const model = buildSeasonModel(data);
    expect(model).toMatchObject({
      seasonYear: 2026,
      weddings: 12,
      completed: 12,
      averagePercent: 76,
      answered: 240,
      total: 300,
      compatibilityWeddings: 12,
      hasData: true,
    });
    expect(model.topQuestion.percent).toBe(90);
  });

  it('shows a localized not-enough-data state, never fabricated values', () => {
    const model = buildSeasonModel(null);
    expect(model.hasData).toBe(false);
    const html = renderToStaticMarkup(createElement(SeasonStory, { seasonData: null }));
    expect(html).toContain('Pas encore assez de données');
    expect(html).not.toContain('NaN');
  });

  it('renders the aggregate card and reserves the lower-third sticker zone', () => {
    const html = renderToStaticMarkup(createElement(SeasonStory, { seasonData: data }));
    expect(html).toContain('76');
    expect(html).toContain('compatibilité moyenne');
    expect(html).toContain('data-sticker-zone="true"');
    expect(html).toContain('Zone sticker Instagram');
    expect(html).toMatch(/inset-x-6 bottom-4/);
  });

  it('never renders couple, venue or per-wedding data', () => {
    const html = renderToStaticMarkup(createElement(SeasonStory, { seasonData: data }));
    for (const forbidden of ['Jennifer', 'Guillaume', 'Dwór', 'ul.', 'w1']) {
      expect(html).not.toContain(forbidden);
    }
  });

  it('builds matching FR/PL aggregate captions', () => {
    const model = buildSeasonModel(data);
    const fr = seasonCaptionLines(model, 'fr').join('\n');
    const pl = seasonCaptionLines(model, 'pl').join('\n');
    expect(fr).toContain('76% de compatibilité sur 12 mariages');
    expect(fr).toContain('240/300');
    expect(pl).toContain('76% zgodności w 12 weselach');
    expect(pl).toContain('240/300');
  });

  it('is available only on the owner-admin surface', () => {
    expect(templatesForSurface('mc').some((item) => item.id === 'season')).toBe(false);
    expect(templatesForSurface('admin').some((item) => item.id === 'season')).toBe(true);
    const studio = read('src/components/SocialExportStudio.jsx');
    expect(studio).toContain('SeasonStory');
    expect(studio).toContain("template?.id === 'season'");
    const overview = read('src/admin/AdminSocialStudio.jsx');
    expect(overview).toContain('useSeasonStats');
    expect(overview).toContain('seasonData={season.data}');
  });

  it('requests the selected season year from the public RPC', async () => {
    const calls = [];
    const result = await fetchSeasonStats({
      config: { enabled: true, url: 'https://example.test', anonKey: 'anon' },
      seasonYear: 2025,
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return { ok: true, json: async () => ({ seasonYear: 2025 }) };
      },
    });
    expect(result.seasonYear).toBe(2025);
    expect(JSON.parse(calls[0].options.body)).toEqual({ p_season_year: 2025 });
  });
});
