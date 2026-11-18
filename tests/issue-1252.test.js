import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PortfolioOverviewView } from '../src/admin/AdminPortfolioOverview.jsx';

const row = {
  id: 'w1',
  couple: 'Jennifer & Guillaume',
  date: '20.08.2026',
  dateISO: '2026-08-20',
  status: 'active',
  servicePackage: 'HOST_AND_DJ_VIP',
  completedSteps: 3,
  totalSteps: 3,
  completionPct: 100,
  onTimePct: 90,
  biggestDelayMinutes: 8,
  requestsTotal: 3,
  requestsAccepted: 2,
  requestsPlayed: 2,
  compatibilityPct: 80,
  recapPublished: true,
  dataQuality: 'recap',
};

const data = {
  weddings: [row],
  portfolio: {
    totals: { all: 1, active: 1, archived: 0, expired: 0, completed: 1, liveNow: 0 },
    recapPublicationRate: 100,
    averageOnTimePct: 90,
    averageCompatibilityPct: 80,
    gamesPlayedPct: 100,
    mix: {
      packages: { HOST_AND_DJ_VIP: 1 },
      languages: { PL: 1, FR: 1 },
      countries: { PL: 1 },
      nationalities: { FR: 1 },
      cultures: { stoLat: 1, gorzko: 0, breadSalt: 1 },
      discoPolo: { ON_REQUEST: 1 },
    },
    providerCategories: { dj: 1, photo1: 1 },
    guests: { total: 96, pl: 64, fr: 24, other: 8, weddingsWithGuests: 1 },
    team: { providers: 2, activeProviders: 2, musicians: 3, witnesses: 2, speeches: 4 },
    music: { songs: 6, doNotPlay: 2, requests: 3, accepted: 2, played: 2 },
    interactions: { games: 2, questions: 24, compatibilityAveragePct: 80 },
    photo: {
      groupPhotoSets: 4,
      attractions: 3,
      miniSessions: 1,
      firstDanceSets: 2,
      specialEffects: 1,
      cakeConfigured: 1,
    },
    coverage: {
      filters: 1,
      quality: 1,
      withGuests: 1,
      withVenue: 1,
      withProviders: 1,
      withMusicians: 1,
      withSpeeches: 1,
      withGames: 1,
      withMusicPolicy: 1,
      withPhotoPlan: 1,
    },
    readiness: {},
  },
};

function render(overrides = {}) {
  return renderToStaticMarkup(
    createElement(PortfolioOverviewView, {
      data,
      filters: {
        year: '',
        status: 'all',
        package: '',
        language: '',
        country: '',
        provider: '',
      },
      ...overrides,
    }),
  );
}

describe('issue #1252 admin Overview full data inventory', () => {
  it('renders every approved KPI group', () => {
    const html = render();
    for (const label of [
      'Guests',
      'Countries',
      'Providers',
      'Musicians',
      'Speeches',
      'Witnesses',
      'Quiz questions',
      'Key songs',
      'Attractions',
      'Sto Lat weddings',
      'Destination mix',
      'Nationality mix',
      'Cultural rules',
      'Provider mix',
      'Disco Polo policy',
      'Data coverage',
    ]) {
      expect(html).toContain(label);
    }
  });

  it('renders real aggregate values and all coverage stats', () => {
    const html = render();
    expect(html).toContain('>96<');
    expect(html).toContain('>24<');
    expect(html).toContain('>6<');
    expect(html).toContain('>1 of 1<');
    for (const label of [
      'Guests',
      'Venue',
      'Providers',
      'Musicians',
      'Speeches',
      'Games',
      'Music policy',
      'Photo plan',
    ]) {
      expect(html).toContain(label);
    }
  });

  it('renders country and provider filters', () => {
    const html = render();
    expect(html).toContain('Country');
    expect(html).toContain('All countries');
    expect(html).toContain('All providers');
    expect(html).toContain('PL');
    expect(html).toContain('dj');
    expect(html).toContain('photo1');
  });

  it('shows localized no-data instead of zeros for an empty payload', () => {
    const html = render({
      data: {
        weddings: [],
        portfolio: {
          totals: { all: 0, active: 0, archived: 0, expired: 0, completed: 0, liveNow: 0 },
          mix: {},
          readiness: {},
          coverage: { filters: 0, quality: 0 },
        },
      },
    });
    expect(html).toContain('No data');
    expect(html).not.toContain('NaN');
  });

  it('never renders contact detail or private notes', () => {
    const html = render();
    expect(html).not.toContain('@');
    expect(html).not.toContain('phone');
    expect(html).not.toContain('email');
    expect(html).not.toContain('device_id');
  });
});
