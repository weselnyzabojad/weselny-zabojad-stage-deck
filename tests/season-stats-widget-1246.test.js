import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { PublicSeasonStatsView } from '../src/components/PublicSeasonStatsWidget.jsx';
import CountryFlag from '../src/components/CountryFlag.jsx';
import { previewSeasonStats } from '../src/demo/seasonStatsPreview.js';
import {
  isEmbedPreviewEnabled,
  normalisePreviewState,
} from '../src/lib/seasonStatsPreview.js';
import { setLocale } from '../src/i18n/index.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const widget = read('src/components/PublicSeasonStatsWidget.jsx');

const base = {
  seasonYear: 2026,
  hasData: true,
  nextWedding: null,
  coverage: { weddings: 0 },
  kpis: { guests: { total: null }, destinations: [] },
};

const pre = {
  ...base,
  seasonYear: 2027,
  nextWedding: { city: 'Kraków', country: 'PL', month: 6, year: 2027 },
  seasonPlan: {
    state: 'pre',
    year: 2027,
    weddings: { total: 12, completed: 0, upcoming: 12 },
    guests: { planned: 1480, completed: null },
    destinations: [
      { country: 'PL', planned: 6, completed: 0 },
      { country: 'FR', planned: 4, completed: 0 },
      { country: 'BE', planned: 2, completed: 0 },
    ],
  },
};

const live = {
  ...base,
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
      { country: 'ES', planned: 2, completed: 0 },
    ],
  },
};

const post = {
  ...base,
  seasonYear: 2025,
  seasonPlan: {
    state: 'post',
    year: 2025,
    weddings: { total: 16, completed: 16, upcoming: 0 },
    guests: { planned: 2100, completed: 2100 },
    destinations: [
      { country: 'PL', planned: 9, completed: 9 },
      { country: 'FR', planned: 4, completed: 4 },
      { country: 'BE', planned: 3, completed: 3 },
    ],
  },
};

function render(data, overrides = {}) {
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

describe('issue #1246 two-KPI season widget and states', () => {
  it('renders exactly two KPI columns', () => {
    const html = render(live);
    expect((html.match(/data-kpi-column=/g) ?? []).length).toBe(2);
    expect(html).not.toContain('International weddings');
    expect(html).not.toContain('Animations orchestrated');
    expect(html).not.toContain('Sto Lat');
  });

  it('renders the before-season state without a zero guest count', () => {
    const html = render(pre);
    expect(html).toContain('Season opening');
    expect(html).toContain('Season 2027 ahead');
    expect(html).toContain('Expected guests');
    expect(html).toContain('1,480');
    expect(html).toContain('across 12 planned weddings');
    expect(html).toContain('Planned destinations');
    expect(html).toContain('Kraków');
    expect(html).toContain('data-country-flag="PL"');
    expect(html).not.toContain('>0<');
    expect(html).not.toContain('Guests hosted');
  });

  it('renders the live state with progress and completed/planned country counts', () => {
    const html = render(live);
    expect(html).toContain('Next wedding');
    expect(html).toContain('Season in progress');
    expect(html).toContain('Lyon');
    expect(html).toContain('7 of 18 weddings');
    expect(html).toContain('width:39%');
    expect(html).toContain('4/10');
    expect(html).toContain('2/5');
    expect(html).toContain('1/3');
    expect(html).toContain('0/2');
    expect(html).toContain('opacity-65');
  });

  it('renders the after-season review', () => {
    const html = render(post);
    expect(html).toContain('Season 2025 closed');
    expect(html).toContain('After season · Review 2025');
    expect(html).toContain('Thank you to the couples and vendors');
    expect(html).toContain('Visited destinations');
    expect(html).toContain('across 16 weddings celebrated in 2025');
    expect(html).toContain('data-country-flag="FR"');
  });

  it('formats numbers with locale grouping', () => {
    setLocale('fr', { persist: false, doc: null });
    const html = render(pre);
    const normalized = html.replace(/\u202f|\u00a0/g, ' ');
    expect(normalized).toContain('1 480');
    expect(html).toContain('tabular-nums');
  });

  it('uses inline SVG flags and a code fallback, never emoji', () => {
    const known = renderToStaticMarkup(createElement(CountryFlag, { code: 'PL' }));
    expect(known).toContain('data-country-flag="PL"');
    expect(known).toContain('<svg');
    const unknown = renderToStaticMarkup(createElement(CountryFlag, { code: 'ZZ' }));
    expect(unknown).toContain('data-flag-fallback="ZZ"');
    expect(unknown).toContain('ZZ');
    expect(unknown).not.toContain('<svg');
    expect(widget).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u);
  });

  it('exposes a dev/recette-only preview with coherent fixtures', () => {
    expect(isEmbedPreviewEnabled({ DEV: true })).toBe(true);
    expect(isEmbedPreviewEnabled({ VITE_EMBED_PREVIEW: '1' })).toBe(true);
    expect(isEmbedPreviewEnabled({ PROD: true })).toBe(false);
    expect(normalisePreviewState('live')).toBe('live');
    expect(normalisePreviewState('invalid')).toBeNull();

    expect(previewSeasonStats('pre').seasonPlan.state).toBe('pre');
    expect(previewSeasonStats('live').seasonPlan.weddings.completed).toBe(7);
    expect(previewSeasonStats('post').seasonPlan.weddings.upcoming).toBe(0);
    const preHtml = render(previewSeasonStats('pre'));
    expect(preHtml).toContain('Kraków');
    expect(preHtml).toContain('Expected guests');

    expect(widget).toContain('EMBED_PREVIEW_ENABLED');
    expect(widget).toContain('previewSeasonStats');
    expect(read('.env.example')).toContain('VITE_EMBED_PREVIEW=1');
  });

  it('uses the compact unified band, thin footer and two-column dividers', () => {
    expect(widget).toContain('max-w-4xl');
    expect(widget).toContain('rounded-xl');
    expect(widget).toContain('px-4 py-1.5');
    expect(widget).toContain('sm:grid-cols-2');
    expect(widget).toContain('divide-y');
    expect(widget).toContain('sm:divide-x');
    expect(widget).toContain('text-xl');
    expect(widget).toContain('sm:text-2xl');
    expect(widget).toContain('text-[#292524]');
    expect(widget).toContain('px-4 py-1');
    expect(widget).toContain('tabular-nums');
    expect(widget).toContain("t('embed.footer.season')");
    expect(widget).toContain('target="_blank"');
    expect(widget).toContain('rel="noopener noreferrer"');
    const html = render(post);
    expect(html).toContain('Season statistics 2025');
    expect(html).toContain('Powered by');
  });

  it('renders the PL/FR/EN switcher and resolves language priority', () => {
    const html = render(pre);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Polski"');
    expect(html).toContain('aria-label="Français"');
    expect(html).toContain('aria-label="English"');
    expect(html).toContain('aria-checked="true"');
    expect(widget).toContain('changeLocale(code)');
    const main = read('src/main.jsx');
    expect(main).toContain("import { resolveEntryLocale } from './lib/localeContinuity.js'");
    expect(main).toContain('if (EMBED_ROUTE)');
    expect(main).toContain('{ persist: false }');
  });
});
