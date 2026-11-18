import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminPortfolioOverview, {
  PortfolioOverviewView,
} from '../src/admin/AdminPortfolioOverview.jsx';
import {
  nextPortfolioSort,
  portfolioYears,
  searchPortfolioRows,
  sortPortfolioRows,
} from '../src/admin/adminPortfolio.js';
import { demoPortfolio } from '../src/admin/adminDemoApi.js';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const filters = { year: '', status: 'all', package: '', language: '' };

function renderView(overrides = {}) {
  return renderToStaticMarkup(
    createElement(PortfolioOverviewView, {
      data: demoPortfolio({}),
      filters,
      ...overrides,
    }),
  );
}

const emptyRow = (overrides = {}) => ({
  id: 'w1',
  couple: 'Test & Couple',
  date: '20.08.2026',
  dateISO: '2026-08-20',
  status: 'active',
  servicePackage: 'HOST_ONLY',
  completedSteps: null,
  totalSteps: null,
  completionPct: null,
  onTimePct: null,
  biggestDelayMinutes: null,
  requestsTotal: 0,
  requestsAccepted: 0,
  requestsPlayed: 0,
  compatibilityPct: null,
  recapPublished: false,
  dataQuality: 'none',
  ...overrides,
});

const emptyPortfolio = {
  totals: { all: 0, active: 0, archived: 0, expired: 0, completed: 0, liveNow: 0 },
  mix: { packages: {}, languages: {} },
  readiness: {},
  coverage: { filters: 0, quality: 0 },
};

describe('issue #1211 admin portfolio overview', () => {
  it('renders the KPI cards and the per-wedding table from one payload', () => {
    const html = renderView();
    expect(html).toContain('Portfolio overview');
    expect(html).toContain('Total weddings');
    expect(html).toContain('Recap published');
    expect(html).toContain('Anna &amp; Piotr');
    expect(html).toContain('Archived');
    expect(html).toContain('Data source');
    expect(html).toContain('aria-sort');
    expect(html).toContain('Wedding portfolio comparison');
  });

  it('renders archived rows and labels every data source', () => {
    const html = renderView();
    expect(html).toContain('Ewa &amp; Tomasz');
    expect(html).toContain('Recap');
    expect(html).toContain('Live');
  });

  it('renders localized no-data states instead of zero', () => {
    const html = renderView({
      data: {
        ...emptyPortfolio,
        totals: { ...emptyPortfolio.totals, all: 1 },
        coverage: { filters: 1, quality: 1 },
        weddings: [emptyRow({ recapPublished: true })],
      },
    });
    expect(html).toContain('No data');
    expect(html).not.toContain('0%');
    expect(html).not.toContain('0 min');
  });

  it('renders loading, empty and error states', () => {
    expect(renderView({ data: null, loading: true })).toContain('Loading the portfolio');
    expect(renderView({ data: { ...emptyPortfolio, weddings: [] } })).toContain(
      'No weddings match these filters',
    );
    const error = renderView({ data: null, loading: false, error: 'network down' });
    expect(error).toContain('Could not load the portfolio');
    expect(error).toContain('network down');
    expect(error).toContain('Try again');
  });

  it('keeps the Overview read-only and shows demo/read-only badges', () => {
    const html = renderView({ readOnly: true, demo: true });
    expect(html).toContain('Read-only');
    expect(html).toContain('Demo data only');
    expect(html).not.toContain('Archive wedding');
    expect(html).not.toContain('Publish recap');
  });

  it('sorts rows with missing values last in both directions', () => {
    const rows = [
      emptyRow({ id: 'missing', completionPct: null }),
      emptyRow({ id: 'half', completionPct: 50 }),
      emptyRow({ id: 'full', completionPct: 100 }),
    ];
    expect(sortPortfolioRows(rows, 'completionPct', 'asc').map((row) => row.id)).toEqual([
      'half',
      'full',
      'missing',
    ]);
    expect(sortPortfolioRows(rows, 'completionPct', 'desc').map((row) => row.id)).toEqual([
      'full',
      'half',
      'missing',
    ]);
    expect(nextPortfolioSort({ key: 'completionPct', direction: 'asc' }, 'completionPct')).toEqual({
      key: 'completionPct',
      direction: 'desc',
    });
  });

  it('searches on the current payload without another request per wedding', () => {
    const rows = demoPortfolio({}).weddings;
    expect(searchPortfolioRows(rows, 'anna').map((row) => row.couple)).toEqual(['Anna & Piotr']);
    expect(searchPortfolioRows(rows, 'HOST_ONLY').map((row) => row.couple)).toEqual(['Maria & Jan']);
    expect(searchPortfolioRows(rows, '   ')).toHaveLength(rows.length);
    expect(portfolioYears(rows)).toEqual(['2026', '2025']);
  });

  it('fetches one portfolio_kpis call and mounts an Overview tab', () => {
    const api = read('src/admin/adminApi.js');
    expect(api).toContain('export async function fetchPortfolioKpis');
    expect(api).toContain("callAdmin('portfolio_kpis', filters)");
    expect(api).toContain('demoPortfolio');

    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain("['overview', 'Overview']");
    expect(app).toContain('<AdminPortfolioOverview readOnly={readOnly} />');

    const overview = read('src/admin/AdminPortfolioOverview.jsx');
    expect(overview).toContain('aria-sort');
    expect(overview).toContain('onFilterChange');
    expect(overview).toContain("filters.year");
    expect(overview).toContain('className="sr-only"');
    expect(overview).toContain('motion-reduce:transition-none');
    expect(overview).toContain('focus-visible:outline');
    expect(overview).not.toContain("from './AdminApp'");
    expect(overview).not.toContain('publishWedding');
    expect(overview).not.toContain('archiveWedding');
    expect(overview).not.toContain('rotatePins');
  });

  it('ships the new keys in PL, EN and FR', () => {
    const keys = Object.keys(en).filter((key) => key.startsWith('admin.portfolio.'));
    expect(keys.length).toBeGreaterThan(40);
    for (const dictionary of [fr, pl]) {
      for (const key of keys) {
        expect(dictionary[key]).toBeTypeOf('string');
        expect(dictionary[key].trim()).not.toBe('');
      }
    }
  });

  it('renders the default component shell', () => {
    const html = renderToStaticMarkup(createElement(AdminPortfolioOverview, { readOnly: false }));
    expect(html).toContain('Portfolio overview');
    expect(html).toContain('Refresh');
  });
});
