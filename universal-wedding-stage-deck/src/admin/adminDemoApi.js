// Local, read-only admin preview used only when VITE_ADMIN_DEMO=1 in a dev
// build. It never contacts Supabase and never ships in production. Mutations
// are intentionally disabled so nobody mistakes the sample data for real.

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
        wedding_id: 'demo-2026',
        couple: 'Aleksandra & MichaĹ‚',
        date: '20.08.2026',
        venue: 'DwĂłr Pod Lipami',
        room_code: '4821',
        roles: ['mc', 'dj', 'photo1', 'photo2', 'video', 'speaker'],
        archived_at: null,
        created_at: hoursAgo(72),
        updated_at: hoursAgo(3),
        cartridge_revision: 3,
        cartridge_source: 'admin_json',
        cartridge_published_at: hoursAgo(3),
      },
      {
        wedding_id: 'demo-2025',
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
        wedding_id: 'demo-2026',
        last_seen: online,
        current_view: 'McMasterView',
      },
      {
        session_jti: 'demo-jti-dj',
        role: 'dj',
        device_id: 'laptop-dj',
        device_label: 'DJ laptop',
        wedding_id: 'demo-2026',
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
        wedding_id: 'demo-2026',
        issued_at: hoursAgo(2),
        expires_at: expires,
        revoked_at: null,
      },
      {
        jti: 'demo-jti-dj',
        role: 'dj',
        device_id: 'laptop-dj',
        device_label: 'DJ laptop',
        wedding_id: 'demo-2026',
        issued_at: hoursAgo(2),
        expires_at: expires,
        revoked_at: null,
      },
    ],
    audit: [
      {
        id: 'demo-audit-1',
        action: 'publish',
        target: 'demo-2026',
        actor_email: 'demo@local',
        created_at: hoursAgo(3),
        detail: { note: 'Demo data only â€” no production records.' },
      },
      {
        id: 'demo-audit-2',
        action: 'rotate_pins',
        target: 'demo-2026',
        actor_email: 'demo@local',
        created_at: hoursAgo(5),
        detail: { roles: ['mc', 'dj', 'photo1', 'photo2', 'video', 'speaker'] },
      },
    ],
  };
}

export function demoMutate(action) {
  throw new Error(
    `Demo preview: "${action}" is disabled. Sample data is read-only and nothing is sent to Supabase.`,
  );
}
