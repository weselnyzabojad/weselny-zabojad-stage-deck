// Local, read-only admin preview used only when VITE_ADMIN_DEMO=1 in a dev
// build. It never contacts Supabase and never ships in production. Mutations
// are intentionally disabled so nobody mistakes the sample data for real.

import { buildPortfolioKpis } from '../../supabase/functions/_shared/portfolioKpis.js';

const DEMO_SESSION = {
  access_token: 'demo-token',
  token_type: 'bearer',
  expires_in: 3600,
  user: { id: 'demo-owner', email: 'demo@local' },
};

export function demoSession() {
  return DEMO_SESSION;
}

export function demoMfaState() {
  return {
    currentLevel: 'aal2',
    nextLevel: 'aal2',
    factors: [{ id: 'demo-factor', status: 'verified', friendly_name: 'Demo TOTP' }],
    needsChallenge: false,
    needsEnrollment: false,
  };
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function demoList() {
  const online = new Date(Date.now() - 20 * 1000).toISOString();
  const idle = new Date(Date.now() - 8 * 60 * 1000).toISOString();
  const expires = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();

  return {
    publicDeckUrl: 'http://localhost:5173/deck',
    weddings: [
      {
        wedding_id: 'Aleksandra&Michal-UM-2026-08-004',
        couple: 'Aleksandra & MichaĹ‚',
        date: '20.08.2026',
        venue: 'DwĂłr Pod Lipami',
        room_code: '4821',
        roles: ['mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'],
        archived_at: null,
        created_at: hoursAgo(72),
        updated_at: hoursAgo(3),
        cartridge_revision: 3,
        cartridge_source: 'admin_json',
        cartridge_published_at: hoursAgo(3),
      },
      {
        wedding_id: 'Sample&Archive-UM-2025-07-001',
        couple: 'Sample & Archive',
        date: '12.07.2025',
        venue: 'Sample Hall',
        room_code: '1077',
        roles: ['mc', 'dj'],
        archived_at: hoursAgo(240),
        created_at: hoursAgo(2000),
        updated_at: hoursAgo(240),
        cartridge_revision: 1,
        cartridge_source: 'legacy_backfill',
        cartridge_published_at: hoursAgo(240),
      },
    ],
    presence: [
      {
        session_jti: 'demo-jti-mc',
        role: 'mc',
        device_id: 'ipad-mc',
        device_label: 'MC iPad',
        wedding_id: 'Aleksandra&Michal-UM-2026-08-004',
        last_seen: online,
        current_view: 'McMasterView',
      },
      {
        session_jti: 'demo-jti-dj',
        role: 'dj',
        device_id: 'laptop-dj',
        device_label: 'DJ laptop',
        wedding_id: 'Aleksandra&Michal-UM-2026-08-004',
        last_seen: idle,
        current_view: 'DjBoothView',
      },
    ],
    sessions: [
      {
        jti: 'demo-jti-mc',
        role: 'mc',
        device_id: 'ipad-mc',
        device_label: 'MC iPad',
        wedding_id: 'Aleksandra&Michal-UM-2026-08-004',
        issued_at: hoursAgo(2),
        expires_at: expires,
        revoked_at: null,
      },
      {
        jti: 'demo-jti-dj',
        role: 'dj',
        device_id: 'laptop-dj',
        device_label: 'DJ laptop',
        wedding_id: 'Aleksandra&Michal-UM-2026-08-004',
        issued_at: hoursAgo(2),
        expires_at: expires,
        revoked_at: null,
      },
    ],
    audit: [
      {
        id: 'demo-audit-1',
        action: 'publish',
        target: 'Aleksandra&Michal-UM-2026-08-004',
        actor_email: 'demo@local',
        created_at: hoursAgo(3),
        detail: { note: 'Demo data only — no production records.' },
      },
      {
        id: 'demo-audit-2',
        action: 'rotate_pins',
        target: 'Aleksandra&Michal-UM-2026-08-004',
        actor_email: 'demo@local',
        created_at: hoursAgo(5),
        detail: { roles: ['mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'] },
      },
    ],
  };
}

function demoWedding(id, overrides = {}) {
  return {
    wedding_id: id,
    couple: 'Couple ' + id,
    date: '20.08.2026',
    archived_at: null,
    expires_at: '2026-12-31T00:00:00.000Z',
    updated_at: hoursAgo(3),
    cartridge: {
      servicePackage: 'HOST_AND_DJ_VIP',
      extensions: {
        dateISO: '2026-08-20',
        languages: { supported: ['PL', 'FR'] },
      },
      steps: [
        { id: 'arrival', time: '18:00' },
        { id: 'dinner', time: '19:00' },
        { id: 'party', time: '21:00' },
      ],
    },
    ...overrides,
  };
}

export function demoPortfolio(filters = {}) {
  const recap = {
    summary: { totalSteps: 3, completedSteps: 3, scheduleChangeCount: 1 },
    timeline: [
      { actualStart: '18:05', driftMinutes: 5 },
      { actualStart: '19:12', driftMinutes: 12 },
      { actualStart: '21:02', driftMinutes: 2 },
    ],
    games: [
      {
        questions: [
          { isCompatible: true },
          { isCompatible: true },
          { isCompatible: false },
        ],
      },
    ],
  };
  return buildPortfolioKpis({
    weddings: [
      demoWedding('Demo&&Anna-Piotr-UM-2026-08-001', {
        couple: 'Anna & Piotr',
        cartridge: {
          servicePackage: 'HOST_AND_DJ_VIP',
          extensions: { dateISO: '2026-08-20', languages: { supported: ['PL', 'FR'] } },
          steps: [
            { id: 'arrival', time: '18:00' },
            { id: 'dinner', time: '19:00' },
            { id: 'party', time: '21:00' },
          ],
        },
      }),
      demoWedding('Demo&Maria-Jan-UM-2026-09-002', {
        couple: 'Maria & Jan',
        date: '12.09.2026',
        cartridge: {
          servicePackage: 'HOST_ONLY',
          extensions: { dateISO: '2026-09-12', languages: { supported: ['PL'] } },
          steps: [
            { id: 'arrival', time: '17:00' },
            { id: 'dinner', time: '18:30' },
            { id: 'party', time: '21:00' },
          ],
        },
      }),
      demoWedding('Demo&Archive-UM-2025-07-003', {
        couple: 'Ewa & Tomasz',
        date: '12.07.2025',
        archived_at: hoursAgo(240),
        cartridge: {
          servicePackage: 'HOST_AND_DJ',
          extensions: { dateISO: '2025-07-12', languages: { supported: ['PL', 'EN'] } },
          steps: [
            { id: 'arrival', time: '18:00' },
            { id: 'dinner', time: '19:00' },
            { id: 'party', time: '21:00' },
          ],
        },
      }),
    ],
    liveStates: {
      'Demo&Maria-Jan-UM-2026-09-002': {
        step_order: ['arrival', 'dinner', 'party'],
        completed_step_ids: ['arrival'],
        actual_timestamps: { arrival: '17:08' },
      },
    },
    recaps: {
      'Demo&&Anna-Piotr-UM-2026-08-001': { payload: recap },
      'Demo&Archive-UM-2025-07-003': { payload: recap },
    },
    requests: {
      'Demo&&Anna-Piotr-UM-2026-08-001': [
        { status: 'accepted', played_at: hoursAgo(24) },
        { status: 'accepted', played_at: null },
        { status: 'pending', played_at: null },
      ],
      'Demo&Archive-UM-2025-07-003': [{ status: 'accepted', played_at: hoursAgo(2000) }],
    },
    roles: {
      'Demo&&Anna-Piotr-UM-2026-08-001': ['mc', 'dj', 'photo1'],
      'Demo&Maria-Jan-UM-2026-09-002': ['mc', 'dj'],
    },
    filters,
    now: new Date(),
  });
}

export function demoMutate(action) {
  throw new Error(
    `Demo preview: "${action}" is disabled. Sample data is read-only and nothing is sent to Supabase.`,
  );
}
