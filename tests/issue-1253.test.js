import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PortfolioOverviewView } from '../src/admin/AdminPortfolioOverview.jsx';
import {
  nextPortfolioSort,
  searchPortfolioRows,
  sortPortfolioRows,
} from '../src/admin/adminPortfolio.js';

const baseRow = {
  id: 'w1',
  couple: 'Jennifer & Guillaume',
  date: '20.08.2026',
  dateISO: '2026-08-20',
  status: 'active',
  servicePackage: 'HOST_AND_DJ_VIP',
  guestsTotal: 96,
  country: 'PL',
  city: 'Jawor',
  venueName: 'Dwór Testowy',
  providerCount: 4,
  musicianCount: 3,
  speechCount: 5,
  witnessCount: 2,
  questionCount: 24,
  songCount: 8,
  completedSteps: 3,
  totalSteps: 3,
  completionPct: 100,
  onTimePct: 90,
  biggestDelayMinutes: 8,
  scheduleChangeCount: 2,
  actualEnd: '23:40',
  requestsTotal: 3,
  requestsAccepted: 2,
  requestsPlayed: 2,
  compatibilityPct: 80,
  recapPublished: true,
  dataQuality: 'recap',
};

const data = {
  weddings: [
    baseRow,
    { ...baseRow, id: 'w2', couple: 'Archived Couple', status: 'archived', dateISO: '2025-07-12' },
  ],
  portfolio: {
    totals: { all: 2, active: 1, archived: 1, expired: 0, completed: 2, liveNow: 0 },
    mix: { packages: { HOST_AND_DJ_VIP: 2 }, languages: { PL: 2 } },
    readiness: {},
    coverage: { filters: 2, quality: 1 },
  },
};

const filters = {
  year: '',
  status: 'all',
  package: '',
  language: '',
  country: '',
  provider: '',
};

const render = () =>
  renderToStaticMarkup(
    createElement(PortfolioOverviewView, { data, filters }),
  );

describe('issue #1253 expanded per-wedding table', () => {
  it('renders every new sortable column', () => {
    const html = render();
    for (const label of [
      'Guests',
      'Country',
      'Providers',
      'Musicians',
      'Speeches',
      'Witnesses',
      'Questions',
      'Songs',
      'Changes',
      'Actual end',
    ]) {
      expect(html).toContain(label);
    }
  });

  it('renders real values and keeps archived rows visible', () => {
    const html = render();
    for (const value of ['96', 'PL', '23:40', 'Archived Couple']) {
      expect(html).toContain(value);
    }
  });

  it('sorts new columns with nulls last in both directions', () => {
    const rows = [
      { id: 'missing', guestsTotal: null },
      { id: 'small', guestsTotal: 40 },
      { id: 'large', guestsTotal: 120 },
    ];
    expect(sortPortfolioRows(rows, 'guestsTotal', 'asc').map((row) => row.id)).toEqual([
      'small',
      'large',
      'missing',
    ]);
    expect(sortPortfolioRows(rows, 'guestsTotal', 'desc').map((row) => row.id)).toEqual([
      'large',
      'small',
      'missing',
    ]);
    expect(nextPortfolioSort({ key: 'guestsTotal', direction: 'desc' }, 'guestsTotal')).toEqual({
      key: 'guestsTotal',
      direction: 'asc',
    });
  });

  it('searches on country, city and venue without another request', () => {
    const rows = [
      baseRow,
      { ...baseRow, id: 'w2', couple: 'Other', country: 'FR', city: 'Lyon', venueName: null },
    ];
    expect(searchPortfolioRows(rows, 'jawor').map((row) => row.id)).toEqual(['w1']);
    expect(searchPortfolioRows(rows, 'lyon').map((row) => row.id)).toEqual(['w2']);
    expect(searchPortfolioRows(rows, 'dwór').map((row) => row.id)).toEqual(['w1']);
  });

  it('shows localized no-data for missing cells and never leaks PII', () => {
    const html = renderToStaticMarkup(
      createElement(PortfolioOverviewView, {
        data: {
          weddings: [{ ...baseRow, guestsTotal: null, country: null, actualEnd: null }],
          portfolio: data.portfolio,
        },
        filters,
      }),
    );
    expect(html).toContain('No data');
    expect(html).not.toContain('@');
    expect(html).not.toContain('device_id');
    expect(html).toContain('overflow-x-auto');
  });
});
