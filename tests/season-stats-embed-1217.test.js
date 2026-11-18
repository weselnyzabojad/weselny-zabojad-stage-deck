import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { PublicSeasonStatsView } from '../src/components/PublicSeasonStatsWidget.jsx';
import { fetchSeasonStats, seasonStatsRpcUrl } from '../src/lib/seasonStats.js';
import { parseSeasonStatsEmbed } from '../src/lib/publicRoutes.js';
import { setLocale } from '../src/i18n/index.js';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const data = {
  seasonYear: 2026,
  hasData: true,
  nextWedding: { city: 'Lyon', country: 'FR', month: 9, year: 2026 },
  seasonPlan: {
    state: 'live',
    year: 2026,
    weddings: { total: 18, completed: 7, upcoming: 11 },
    guests: { planned: 2400, completed: 920 },
    destinations: [
      { country: 'PL', planned: 10, completed: 4 },
      { country: 'FR', planned: 5, completed: 2 },
      { country: 'BE', planned: 3, completed: 1 },
    ],
  },
  coverage: { weddings: 7, guestCounts: 6, countries: 3 },
  kpis: {
    guests: { total: 920 },
    destinations: [
      { country: 'PL', weddings: 4 },
      { country: 'FR', weddings: 2 },
      { country: 'BE', weddings: 1 },
    ],
  },
};

function render(overrides = {}) {
  return renderToStaticMarkup(
    createElement(PublicSeasonStatsView, {
      data,
      status: 'ready',
      theme: 'transparent',
      ...overrides,
    }),
  );
}

beforeEach(() => {
  setLocale('en', { persist: false, doc: null });
});

describe('public season stats embed', () => {
  it('parses the embed route with per-request language, theme and preview state', () => {
    expect(parseSeasonStatsEmbed('/embed/season-stats', '')).toMatchObject({
      lang: null,
      theme: 'transparent',
      previewState: null,
    });
    expect(parseSeasonStatsEmbed('/embed/season-stats', '?lang=fr')).toMatchObject({
      lang: 'fr',
      theme: 'transparent',
    });
    expect(parseSeasonStatsEmbed('/embed/season-stats', '?theme=cream')).toMatchObject({
      theme: 'cream',
    });
    expect(
      parseSeasonStatsEmbed('/embed/season-stats', '?previewState=live'),
    ).toMatchObject({ previewState: 'live' });
    expect(
      parseSeasonStatsEmbed('/embed/season-stats', '?previewState=unknown'),
    ).toMatchObject({ previewState: null });
    expect(parseSeasonStatsEmbed('/embed/other', '')).toBeNull();
  });

  it('calls the public RPC with the anon key only', async () => {
    const calls = [];
    const payload = await fetchSeasonStats({
      config: { enabled: true, url: 'https://example.supabase.co', anonKey: 'anon-key' },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return { ok: true, json: async () => ({ hasData: true }) };
      },
    });
    expect(payload).toEqual({ hasData: true });
    expect(calls[0].url).toBe(
      'https://example.supabase.co/rest/v1/rpc/get_public_season_stats',
    );
    expect(calls[0].options.headers.apikey).toBe('anon-key');
    expect(calls[0].options.headers.Authorization).toBe('Bearer anon-key');
    expect(calls[0].options.body).toBe('{}');
    expect(seasonStatsRpcUrl({ url: 'https://example.supabase.co/' })).toBe(
      'https://example.supabase.co/rest/v1/rpc/get_public_season_stats',
    );
    await expect(fetchSeasonStats({ config: { enabled: false } })).rejects.toThrow(
      'not configured',
    );
  });

  it('renders exactly two KPI cards from the season plan', () => {
    const html = render();
    expect(html).toContain('Guests hosted');
    expect(html).toContain('Destinations');
    expect(html).toContain('data-country="PL"');
    expect(html).toContain('data-country="FR"');
    expect(html).toContain('data-country="BE"');
    expect(html).not.toContain('International weddings');
    expect(html).not.toContain('Animations orchestrated');
    expect(html).not.toContain('weddings with Sto Lat');
  });

  it('hides the strip and uses a neutral fallback with no data', () => {
    const html = render({ data: { hasData: false, seasonPlan: { state: 'none' } } });
    expect(html).toContain('Season statistics will appear');
    expect(html).not.toContain('data-country=');
    expect(html).not.toContain('Guests hosted');
  });

  it('supports transparent and cream surfaces', () => {
    const transparent = render({ theme: 'transparent' });
    expect(transparent).toContain('overflow-hidden bg-transparent');

    const cream = render({ theme: 'cream' });
    expect(cream).toContain('overflow-hidden bg-[#FAF8F5]');
  });

  it('lazy-loads only the widget at /embed/season-stats and hides PWA chrome', () => {
    const main = read('src/main.jsx');
    expect(main).toContain("import('./components/PublicSeasonStatsWidget.jsx')");
    expect(main).toContain('parseSeasonStatsEmbed');
    expect(main).toContain('EMBED_ROUTE ?');
    expect(main).toContain('<PublicSeasonStatsWidget route={EMBED_ROUTE} />');
    expect(main).toContain("setLocale(EMBED_ROUTE.lang || loadLocale() || 'pl', { persist: false })");
    expect(main).toContain('IS_LANDING || IS_BANNER || RECAP_TOKEN || EMBED_ROUTE');
  });

  it('ships the embed keys in PL, EN and FR', () => {
    const keys = Object.keys(en).filter((key) => key.startsWith('embed.'));
    expect(keys.length).toBeGreaterThanOrEqual(12);
    for (const dictionary of [fr, pl]) {
      for (const key of keys) {
        expect(dictionary[key]).toBeTypeOf('string');
        expect(dictionary[key].trim()).not.toBe('');
      }
    }
  });
});
