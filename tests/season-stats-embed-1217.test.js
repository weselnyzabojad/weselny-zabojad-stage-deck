import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  PublicSeasonStatsView,
} from '../src/components/PublicSeasonStatsWidget.jsx';
import { fetchSeasonStats, seasonStatsRpcUrl } from '../src/lib/seasonStats.js';
import { parseSeasonStatsEmbed } from '../src/lib/publicRoutes.js';
import { setLocale } from '../src/i18n/index.js';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const data = {
  seasonYear: 2027,
  hasData: true,
  coverage: { weddings: 4, guestCounts: 3, countries: 3, stolat: 2, animations: 4 },
  kpis: {
    guests: { total: 320, weddingsWithGuests: 3 },
    destinations: [
      { country: 'PL', weddings: 2 },
      { country: 'FR', weddings: 1 },
      { country: 'BE', weddings: 1 },
    ],
    stolatWeddings: 3,
    animations: { total: 18 },
  },
  nextWedding: { city: 'Lyon', country: 'FR', month: 6, year: 2027 },
};

function render(overrides = {}) {
  return renderToStaticMarkup(
    createElement(PublicSeasonStatsView, {
      data,
      status: 'ready',
      theme: 'dark',
      ...overrides,
    }),
  );
}

beforeEach(() => {
  setLocale('en', { persist: false, doc: null });
});

describe('issue #1217 public season stats embed', () => {
  it('parses the embed route with PL default and per-request parameters', () => {
    expect(parseSeasonStatsEmbed('/embed/season-stats', '')).toEqual({
      lang: 'pl',
      theme: 'dark',
    });
    expect(parseSeasonStatsEmbed('/embed/season-stats/', '?lang=fr')).toEqual({
      lang: 'fr',
      theme: 'dark',
    });
    expect(parseSeasonStatsEmbed('/embed/season-stats', '?lang=en&theme=transparent')).toEqual({
      lang: 'en',
      theme: 'transparent',
    });
    expect(parseSeasonStatsEmbed('/embed/season-stats', '?lang=de')).toEqual({
      lang: 'pl',
      theme: 'dark',
    });
    expect(parseSeasonStatsEmbed('/deck/embed/season-stats', '?lang=fr', '/deck/')).toEqual({
      lang: 'fr',
      theme: 'dark',
    });
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
    await expect(
      fetchSeasonStats({
        config: { enabled: true, url: 'https://x', anonKey: 'k' },
        fetchImpl: async () => ({ ok: false, status: 503 }),
      }),
    ).rejects.toThrow('503');
  });

  it('renders the four KPI cards and the next-wedding strip', () => {
    const html = render();
    expect(html).toContain('Guests hosted');
    expect(html).toContain('320');
    expect(html).toContain('Destinations');
    expect(html).toContain('Weddings with Sto Lat');
    expect(html).toContain('Animations orchestrated');
    expect(html).toContain('Next wedding');
    expect(html).toContain('Lyon');
    expect(html).toContain('June 2027');
    expect(html).toContain('data-vehicle="plane"');
    expect(html).toContain('3 of 4 weddings');
    expect(html).toContain('PL · FR · BE');
    expect(html).toContain('href="https://deck.weselnyzabojad.pl"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Season statistics • Powered by Stage Deck');
  });

  it('uses the car icon for a Polish next wedding', () => {
    const html = render({ data: { ...data, nextWedding: { ...data.nextWedding, country: 'PL' } } });
    expect(html).toContain('data-vehicle="car"');
    expect(html).not.toContain('data-vehicle="plane"');
  });

  it('hides the next-wedding strip when it is absent', () => {
    const html = render({ data: { ...data, nextWedding: null } });
    expect(html).not.toContain('Next wedding');
    expect(html).not.toContain('data-vehicle=');
  });

  it('renders the loading skeleton without an error screen', () => {
    const html = render({ data: null, status: 'loading' });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Loading season statistics');
    expect(html).not.toContain('Guests hosted');
    expect(html).not.toContain('Error');
  });

  it('uses a calm fallback for empty, error or too-few KPI values', () => {
    for (const overrides of [
      { data: null, status: 'error' },
      { data: { ...data, hasData: false } },
      {
        data: {
          ...data,
          kpis: { guests: { total: 320 }, destinations: [] },
        },
      },
    ]) {
      const html = render(overrides);
      expect(html).toContain('Season statistics will appear after the first wedding recap');
      expect(html).not.toContain('Error');
      expect(html).not.toContain('>0<');
    }
  });

  it('hides null and zero cards instead of printing zeros', () => {
    const html = render({
      data: {
        ...data,
        kpis: {
          guests: { total: 320 },
          destinations: null,
          stolatWeddings: 0,
          animations: { total: 18 },
        },
      },
    });
    expect(html).toContain('Guests hosted');
    expect(html).toContain('Animations orchestrated');
    expect(html).not.toContain('Destinations');
    expect(html).not.toContain('Weddings with Sto Lat');
    expect(html).not.toContain('>0<');
  });

  it('supports the transparent theme without a page background', () => {
    const html = render({ theme: 'transparent' });
    expect(html).toContain('bg-transparent');
    expect(html).not.toContain('bg-slate-950');
  });

  it('lazy-loads only the widget at /embed/season-stats and hides PWA chrome', () => {
    const main = read('src/main.jsx');
    expect(main).toContain("import('./components/PublicSeasonStatsWidget.jsx')");
    expect(main).toContain('parseSeasonStatsEmbed');
    expect(main).toContain('EMBED_ROUTE ?');
    expect(main).toContain('<PublicSeasonStatsWidget route={EMBED_ROUTE} />');
    expect(main).toContain('setLocale(EMBED_ROUTE.lang, { persist: false })');
    expect(main).toContain('IS_LANDING || RECAP_TOKEN || EMBED_ROUTE');
    expect(main).not.toContain('HttpError');
  });

  it('ships the embed keys in PL, EN and FR', () => {
    const keys = Object.keys(en).filter((key) => key.startsWith('embed.'));
    expect(keys.length).toBeGreaterThanOrEqual(9);
    for (const dictionary of [fr, pl]) {
      for (const key of keys) {
        expect(dictionary[key]).toBeTypeOf('string');
        expect(dictionary[key].trim()).not.toBe('');
      }
    }
  });
});
