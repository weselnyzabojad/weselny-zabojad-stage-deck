import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyPortfolioFilters,
  buildPortfolioKpis,
} from '../supabase/functions/_shared/portfolioKpis.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const now = new Date('2026-11-18T12:00:00.000Z');

const wedding = {
  wedding_id: 'w1',
  couple: 'Jennifer & Guillaume',
  date: '20.08.2026',
  archived_at: null,
  expires_at: '2026-12-31T00:00:00.000Z',
  updated_at: '2026-08-21T00:00:00.000Z',
  venue_name: 'Dwór Testowy',
  venue_city: 'Jawor',
  venue_country: 'PL',
  cartridge_revision: 7,
  cartridge: {
    servicePackage: 'HOST_AND_DJ_VIP',
    extensions: { dateISO: '2026-08-20', languages: { hostLanguages: ['PL', 'FR'] } },
    steps: [
      { id: 'a', time: '17:00', type: 'CEREMONY', location: 'Garden' },
      { id: 'b', time: '18:00', type: 'DINNER', location: 'Hall' },
      { id: 'c', time: '23:00', type: 'PARTY', location: 'Hall' },
    ],
    coupleProfile: {
      bride: { firstName: 'Jennifer', nationalities: ['FR'] },
      groom: { firstName: 'Guillaume', nationalities: ['FR', 'PL'] },
      commonLanguages: ['FR', 'PL'],
    },
    demographics: { total: 96, pl: 64, fr: 24, other: 8 },
    culturalRules: {
      sto_lat: { status: 'YES' },
      gorzko: { status: 'IF_GUESTS_START' },
      bread_salt: { status: 'YES' },
    },
    musicPolicy: {
      importantSongs: [{ id: 'first_dance', moment: 'FIRST_DANCE' }],
      mustPlay: [{ id: 'm1', track: 'Song' }],
      doNotPlay: [{ track: 'Nope' }],
      discoPoloPolicy: 'ON_REQUEST',
      requestsOpen: true,
      requestWindow: { start: '20:00', end: '23:00' },
    },
    speeches: [{ id: 's1' }, { id: 's2' }],
    witnesses: [{ id: 'wit1', name: 'Witness' }],
    attractions: [{ id: 'p1' }],
    groupPhotos: { groups: [{ id: 'g1', label: 'Family' }] },
    miniSession: { enabled: true },
    cake: { time: '21:30' },
    firstDance: [{ id: 'fd1' }],
    specialEffects: [{ id: 'fx1' }],
    photoPlan: { sections: [{ id: 'ph1' }] },
    oczepiny: { subEvents: [{ id: 'o1' }, { id: 'o2' }] },
  },
};

const recap = {
  summary: {
    totalSteps: 3,
    completedSteps: 3,
    scheduleChangeCount: 2,
    actualEnd: '23:40',
    actualDurationMinutes: 380,
  },
  timeline: [{ actualStart: '17:05', driftMinutes: 5 }],
  games: [{ questions: [{ isCompatible: true }, { isCompatible: true }] }],
};

const sources = {
  providers: {
    w1: [
      { wedding_id: 'w1', category: 'dj', active: true },
      { wedding_id: 'w1', category: 'photo1', active: false },
    ],
  },
  musicians: {
    w1: [
      { wedding_id: 'w1', active: true, ceremony_required: true },
      { wedding_id: 'w1', active: false, ceremony_required: false },
    ],
  },
  speeches: {
    w1: [
      { wedding_id: 'w1', status: 'PUBLISHED', speaker_language: 'FR' },
      { wedding_id: 'w1', status: 'DRAFT', speaker_language: 'PL' },
    ],
  },
  gameBundles: {
    w1: [
      { wedding_id: 'w1', game_type: 'TEST_ZGODNOSCI', status: 'PUBLISHED', question_count: 12 },
    ],
  },
  receipts: { w1: [{ wedding_id: 'w1' }, { wedding_id: 'w1' }] },
  sessions: {
    w1: [
      { wedding_id: 'w1', revoked_at: null },
      { wedding_id: 'w1', revoked_at: '2026-08-20T00:00:00.000Z' },
    ],
  },
  presence: {
    w1: [
      { wedding_id: 'w1', status: 'online' },
      { wedding_id: 'w1', status: 'offline' },
    ],
  },
  cartridgeRevisions: { w1: 7 },
};

function build(overrides = {}) {
  return buildPortfolioKpis({
    weddings: [wedding],
    recaps: { w1: { payload: recap } },
    requests: {
      w1: [
        { status: 'accepted', played_at: '2026-08-20T20:00:00.000Z' },
        { status: 'pending', played_at: null },
      ],
    },
    roles: { w1: ['mc', 'dj'] },
    ...sources,
    now,
    ...overrides,
  });
}

describe('issue #1251 full admin portfolio data layer', () => {
  it('exposes guests, venue and package data from the cartridge', () => {
    const row = build().weddings[0];
    expect(row.guestsTotal).toBe(96);
    expect(row.guestsPl).toBe(64);
    expect(row.guestsFr).toBe(24);
    expect(row.guestsOther).toBe(8);
    expect(row.country).toBe('PL');
    expect(row.city).toBe('Jawor');
    expect(row.venueName).toBe('Dwór Testowy');
    expect(row.details.couple.brideNationalities).toEqual(['FR']);
    expect(row.details.cultural).toEqual({
      stoLat: 'YES',
      gorzko: 'IF_GUESTS_START',
      breadSalt: 'YES',
    });
  });

  it('exposes providers, musicians, speeches, games and team counts', () => {
    const row = build().weddings[0];
    expect(row.providerCount).toBe(2);
    expect(row.activeProviderCount).toBe(1);
    expect(row.details.providers.categories).toEqual({ dj: 1, photo1: 1 });
    expect(row.musicianCount).toBe(2);
    expect(row.activeMusicianCount).toBe(1);
    expect(row.details.musicians.ceremonyRequired).toBe(1);
    expect(row.speechCount).toBe(2);
    expect(row.speechRecordCount).toBe(2);
    expect(row.details.speeches.languages).toEqual(['FR', 'PL']);
    expect(row.gameBundleCount).toBe(1);
    expect(row.questionCount).toBe(12);
    expect(row.details.team).toEqual({ sessions: 1, presence: 1, receipts: 2 });
    expect(row.cartridgeRevision).toBe(7);
  });

  it('exposes music, timeline, photo and oczepiny groups', () => {
    const row = build().weddings[0];
    expect(row.details.music).toMatchObject({
      importantSongs: 1,
      mustPlay: 1,
      doNotPlay: 1,
      discoPolo: 'ON_REQUEST',
      requestsOpen: true,
      guestRequests: 2,
    });
    expect(row.details.timeline).toMatchObject({
      steps: 3,
      types: { CEREMONY: 1, DINNER: 1, PARTY: 1 },
      locations: 2,
      scheduleChanges: 2,
      actualEnd: '23:40',
      actualDurationMinutes: 380,
    });
    expect(row.details.photo).toMatchObject({
      groupPhotos: 1,
      miniSession: true,
      attractions: 1,
      cake: true,
      firstDance: 1,
      specialEffects: 1,
      photoPlanSections: 1,
    });
    expect(row.details.oczepiny).toBe(2);
  });

  it('aggregates the new groups without fake zeros', () => {
    const { portfolio } = build();
    expect(portfolio.guests).toEqual({
      total: 96,
      pl: 64,
      fr: 24,
      other: 8,
      weddingsWithGuests: 1,
    });
    expect(portfolio.mix.countries).toEqual({ PL: 1 });
    expect(portfolio.mix.nationalities).toEqual({ FR: 2, PL: 1 });
    expect(portfolio.providerCategories).toEqual({ dj: 1, photo1: 1 });
    expect(portfolio.team).toEqual({
      providers: 2,
      activeProviders: 1,
      musicians: 2,
      witnesses: 1,
      speeches: 2,
    });
    expect(portfolio.music).toMatchObject({
      songs: 2,
      doNotPlay: 1,
      requests: 2,
      accepted: 1,
      played: 1,
    });
    expect(portfolio.interactions).toMatchObject({ games: 1, questions: 12 });
    expect(portfolio.photo.groupPhotoSets).toBe(1);
    expect(portfolio.coverage.withGuests).toBe(1);
    expect(portfolio.coverage.withVenue).toBe(1);
    expect(portfolio.coverage.withProviders).toBe(1);
    expect(portfolio.coverage.withMusicians).toBe(1);
    expect(portfolio.coverage.withSpeeches).toBe(1);
    expect(portfolio.coverage.withGames).toBe(1);
    expect(portfolio.coverage.withPhotoPlan).toBe(1);
  });

  it('filters by country and provider category', () => {
    const rows = build().weddings;
    expect(applyPortfolioFilters(rows, { country: 'pl' })).toHaveLength(1);
    expect(applyPortfolioFilters(rows, { country: 'FR' })).toHaveLength(0);
    expect(applyPortfolioFilters(rows, { provider: 'dj' })).toHaveLength(1);
    expect(applyPortfolioFilters(rows, { provider: 'video' })).toHaveLength(0);
  });

  it('keeps contact detail and private notes out of the payload', () => {
    const payload = JSON.stringify(build());
    for (const forbidden of ['@', 'phone', 'email', 'device_id', 'speaker_name', 'notes']) {
      expect(payload).not.toContain(forbidden);
    }
  });

  it('wires every source into admin_api without PII selects', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    const start = api.indexOf("action === 'portfolio_kpis'");
    const block = api.slice(start, api.indexOf("if (action === 'list')", start));
    for (const table of [
      'wedding_service_providers',
      'wedding_musicians',
      'speech_records',
      'game_question_bundles',
      'stage_step_receipts',
      'role_sessions',
      'role_presence',
    ]) {
      expect(block).toContain(table);
    }
    for (const forbidden of ['device_id', 'pin_hash', 'contacts', 'notes', 'mutation_log']) {
      expect(block).not.toContain(forbidden);
    }
    expect(block).not.toContain("select('*')");
  });
});
