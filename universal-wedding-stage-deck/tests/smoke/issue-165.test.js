// Issue #165: server-published cartridge revisions are the only source of
// truth. These tests are offline: they exercise the shared Edge modules with
// mocked Supabase clients, compare validators, and assert the migration/RLS
// contract without deploying anything.

import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  collectSemanticErrors as collectBrowserSemanticErrors,
} from '../../src/lib/cartridgeValidation.js';
import {
  collectSemanticErrors as collectServerSemanticErrors,
  sanitizeCartridge as serverSanitize,
} from '../../supabase/functions/_shared/cartridgeSemantics.js';
import { makeCartridgeValidator } from '../../supabase/functions/_shared/cartridgeValidator.js';
import {
  authorizeAdminSession,
  mfaFresh,
} from '../../supabase/functions/_shared/adminAuth.js';
import {
  buildPublishAuditDetail,
  isStaleRevisionError,
  normalizePublishRequest,
  publishCartridge,
} from '../../supabase/functions/_shared/adminPublish.js';

const ROOT = process.cwd();
const FIXTURES = path.join(ROOT, 'schema', 'fixtures');
const WEDDING_ID = '2026-08-20_jennifer_guillaume';

const BASE_CARTRIDGE = {
  schemaVersion: '1.1',
  weddingId: WEDDING_ID,
  couple: 'Jennifer & Guillaume',
  date: '20.08.2026',
  syncPin: '2008',
  hostingMode: 'HOST_ONLY',
  culturalRules: {
    sto_lat: { status: 'YES' },
    gorzko: { status: 'STRICT_NO' },
    bread_salt: { status: 'TBC' },
  },
  steps: [
    { id: 'arrival', time: '16:00', durationMin: 30, title: 'Arrival', type: 'FLEXIBLE', location: 'Garden' },
  ],
};

function cartridge(overrides = {}) {
  return {
    ...JSON.parse(JSON.stringify(BASE_CARTRIDGE)),
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    weddingId: WEDDING_ID,
    couple: 'Jennifer & Guillaume',
    date: '20.08.2026',
    cartridge: cartridge(),
    roles: ['mc'],
    requestedRoomCode: '',
    expectedRevision: 0,
    expiresInDays: null,
    source: 'admin_json',
    ...overrides,
  };
}

function mockAdmin({ existing = null, rpcResult = null, rpcError = null, readError = null } = {}) {
  const calls = { rpc: [], reads: 0 };
  const admin = {
    from(table) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          calls.reads += 1;
          return { data: existing, error: readError };
        },
        table,
      };
    },
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      return { data: rpcResult, error: rpcError };
    },
  };
  return { admin, calls };
}

const acceptAll = async (value) => ({ valid: true, errors: [], cartridge: value });

describe('issue #165 shared schema and semantic parity', () => {
  it('ships a byte-identical schema copy for the Edge Function bundle', async () => {
    const canonical = await readFile(path.join(ROOT, 'schema', 'wedding-schema-v1.1.json'));
    const bundled = await readFile(
      path.join(ROOT, 'supabase', 'functions', '_shared', 'wedding-schema-v1.1.json'),
    );
    expect(bundled.equals(canonical)).toBe(true);
  });

  it('matches the browser semantic rules on every fixture', async () => {
    const files = (await readdir(FIXTURES)).filter((file) => file.endsWith('.json'));
    expect(files.length).toBeGreaterThan(10);

    for (const file of files) {
      const value = JSON.parse(await readFile(path.join(FIXTURES, file), 'utf8'));
      expect(collectServerSemanticErrors(value), file).toEqual(
        collectBrowserSemanticErrors(value),
      );
    }
  });

  it('strips retired fields server-side before publication', () => {
    const clean = serverSanitize(
      cartridge({
        jokersCount: 3,
        weatherVariants: [],
        steps: [{ id: 'arrival', deferable: true, weatherOption: 'rain' }],
        liveSyncState: { deferred_step_ids: ['arrival'], manual_offset_minutes: 5 },
      }),
    );

    expect(clean).not.toHaveProperty('jokersCount');
    expect(clean).not.toHaveProperty('weatherVariants');
    expect(clean.steps[0]).not.toHaveProperty('deferable');
    expect(clean.steps[0]).not.toHaveProperty('weatherOption');
    expect(clean.liveSyncState).not.toHaveProperty('deferred_step_ids');
    expect(clean.liveSyncState).not.toHaveProperty('manual_offset_minutes');
  });

  it('rejects invalid cartridges with the same Ajv build the Edge Function uses', async () => {
    const schema = JSON.parse(
      await readFile(path.join(ROOT, 'schema', 'wedding-schema-v1.1.json'), 'utf8'),
    );
    const oczepinyDomain = JSON.parse(
      await readFile(path.join(ROOT, 'schema', 'domains', 'oczepiny.json'), 'utf8'),
    );
    const firstDanceDomain = JSON.parse(
      await readFile(path.join(ROOT, 'schema', 'domains', 'first-dance.json'), 'utf8'),
    );
    const attractionsDomain = JSON.parse(
      await readFile(path.join(ROOT, 'schema', 'domains', 'attractions.json'), 'utf8'),
    );
    const culturalRulesDomain = JSON.parse(
      await readFile(path.join(ROOT, 'schema', 'domains', 'cultural-rules.json'), 'utf8'),
    );
    const coupleProfileDomain = JSON.parse(
      await readFile(path.join(ROOT, 'schema', 'domains', 'couple-profile.json'), 'utf8'),
    );
    const validate = makeCartridgeValidator(Ajv2020, schema, [
      oczepinyDomain,
      firstDanceDomain,
      attractionsDomain,
      culturalRulesDomain,
      coupleProfileDomain,
    ]);

    const valid = await validate(cartridge());
    expect(valid.valid).toBe(true);

    const invalid = await validate(cartridge({ schemaVersion: '9.9', steps: [] }));
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

});

describe('issue #165 publish request contract', () => {
  it('rejects invalid ids, mismatched cartridge ids and bad revisions', () => {
    expect(normalizePublishRequest({ ...request(), weddingId: 'not-an-id' }).status).toBe(400);
    expect(
      normalizePublishRequest({
        ...request(),
        cartridge: cartridge({ weddingId: '2026-08-21_someone_else' }),
      }).error,
    ).toMatch(/must match/);
    expect(normalizePublishRequest({ ...request(), expectedRevision: -1 }).status).toBe(400);
    expect(normalizePublishRequest({ ...request(), expectedRevision: 'abc' }).status).toBe(400);
    expect(normalizePublishRequest({ ...request(), cartridge: null }).status).toBe(400);
  });

  it('defaults a new publication to revision 0 and normalizes room codes', () => {
    const normalized = normalizePublishRequest({
      ...request(),
      roomCode: '  ABC123  ',
      expectedRevision: undefined,
    });
    expect(normalized.request.expectedRevision).toBeNull();
    expect(normalized.request.requestedRoomCode).toBe('abc123');
  });
});

describe('issue #165 publishCartridge', () => {
  it('publishes a new revision and passes the expected revision to the RPC', async () => {
    const { admin, calls } = mockAdmin({
      existing: { room_code: 'abc123', cartridge_revision: 2, archived_at: null },
      rpcResult: {
        wedding_id: WEDDING_ID,
        room_code: 'abc123',
        created: false,
        previous_revision: 2,
        cartridge_revision: 3,
        cartridge_source: 'admin_json',
        cartridge_published_at: '2026-11-06T12:00:00.000Z',
      },
    });

    const published = await publishCartridge({
      admin,
      request: request({ expectedRevision: 2 }),
      actor: { user_id: 'owner-1' },
      validate: acceptAll,
    });

    expect(published.ok).toBe(true);
    expect(published.result).toMatchObject({
      weddingId: WEDDING_ID,
      roomCode: 'abc123',
      created: false,
      previousRevision: 2,
      cartridgeRevision: 3,
      cartridgeSource: 'admin_json',
    });
    expect(calls.rpc).toHaveLength(1);
    expect(calls.rpc[0].name).toBe('stage_deck_publish_cartridge');
    expect(calls.rpc[0].args).toMatchObject({
      p_wedding_id: WEDDING_ID,
      p_room_code: 'abc123',
      p_expected_revision: 2,
      p_actor: 'owner-1',
      p_source: 'admin_json',
    });
    expect(calls.rpc[0].args.p_cartridge).toMatchObject({ weddingId: WEDDING_ID });
  });

  it('creates a brand-new wedding at revision 1', async () => {
    const { admin, calls } = mockAdmin({
      existing: null,
      rpcResult: {
        wedding_id: WEDDING_ID,
        room_code: 'new123',
        created: true,
        previous_revision: 0,
        cartridge_revision: 1,
        cartridge_source: 'admin_json',
        cartridge_published_at: '2026-11-06T12:00:00.000Z',
      },
    });

    const published = await publishCartridge({
      admin,
      request: request({ expectedRevision: 0, requestedRoomCode: 'new123' }),
      actor: { user_id: 'owner-1' },
      validate: acceptAll,
    });

    expect(published.ok).toBe(true);
    expect(published.result).toMatchObject({ created: true, cartridgeRevision: 1 });
    expect(calls.rpc[0].args.p_expected_revision).toBe(0);
  });

  it('refuses an existing wedding without expectedRevision', async () => {
    const { admin, calls } = mockAdmin({
      existing: { room_code: 'abc123', cartridge_revision: 4, archived_at: null },
    });
    const published = await publishCartridge({
      admin,
      request: request({ expectedRevision: null }),
      validate: acceptAll,
    });

    expect(published).toMatchObject({ ok: false, status: 409, currentRevision: 4 });
    expect(calls.rpc).toHaveLength(0);
  });

  it('rejects a stale expectedRevision before writing', async () => {
    const { admin, calls } = mockAdmin({
      existing: { room_code: 'abc123', cartridge_revision: 4, archived_at: null },
    });
    const published = await publishCartridge({
      admin,
      request: request({ expectedRevision: 3 }),
      validate: acceptAll,
    });

    expect(published).toMatchObject({
      ok: false,
      status: 409,
      stale: true,
      currentRevision: 4,
    });
    expect(calls.rpc).toHaveLength(0);
  });

  it('maps the SQL stale-revision error to HTTP 409', async () => {
    const { admin } = mockAdmin({
      existing: { room_code: 'abc123', cartridge_revision: 5, archived_at: null },
      rpcError: { code: '40001', message: 'stale_cartridge_revision' },
    });
    const published = await publishCartridge({
      admin,
      request: request({ expectedRevision: 5 }),
      validate: acceptAll,
    });

    expect(published).toMatchObject({
      ok: false,
      status: 409,
      stale: true,
      currentRevision: 5,
    });
    expect(isStaleRevisionError({ code: '40001' })).toBe(true);
    expect(isStaleRevisionError({ message: 'stale_cartridge_revision' })).toBe(true);
    expect(isStaleRevisionError({ message: 'something else' })).toBe(false);
  });

  it('rejects a cartridge whose id changed during validation', async () => {
    const { admin, calls } = mockAdmin({ existing: null });
    const published = await publishCartridge({
      admin,
      request: request(),
      validate: async () => ({
        valid: true,
        errors: [],
        cartridge: cartridge({ weddingId: '2026-08-21_other_wedding' }),
      }),
    });

    expect(published).toMatchObject({ ok: false, status: 400 });
    expect(calls.rpc).toHaveLength(0);
  });

  it('returns validation errors and never calls the RPC', async () => {
    const { admin, calls } = mockAdmin({ existing: null });
    const published = await publishCartridge({
      admin,
      request: request(),
      validate: async () => ({
        valid: false,
        errors: [{ location: '/steps', message: 'required' }],
      }),
    });

    expect(published).toMatchObject({ ok: false, status: 400 });
    expect(published.errors).toEqual([{ location: '/steps', message: 'required' }]);
    expect(calls.rpc).toHaveLength(0);
  });

  it('records actor, old/new revision and source for the audit log', () => {
    expect(
      buildPublishAuditDetail(
        {
          previousRevision: 2,
          cartridgeRevision: 3,
          cartridgeSource: 'admin_json',
          created: false,
        },
        request({ expectedRevision: 2 }),
      ),
    ).toEqual({
      oldRevision: 2,
      newRevision: 3,
      source: 'admin_json',
      sourceMetadata: null,
      expectedRevision: 2,
      created: false,
    });
  });
});

describe('issue #165 admin authorization', () => {
  const user = { id: 'owner-1' };
  const allowlisted = { user_id: 'owner-1', email: 'owner@example.com' };

  it('requires a valid user, allowlist membership and AAL2', () => {
    expect(authorizeAdminSession({}).status).toBe(401);
    expect(authorizeAdminSession({ user }).status).toBe(403);
    expect(authorizeAdminSession({ user, allowlisted, claims: { aal: 'aal1' } })).toMatchObject({
      ok: false,
      status: 403,
      requiresMfa: true,
    });
    expect(authorizeAdminSession({ user, allowlisted, claims: { aal: 'aal2' } })).toEqual({
      ok: true,
    });
  });

  it('only treats a recent TOTP re-auth as fresh', () => {
    const now = 1_000_000;
    expect(mfaFresh({ aal: 'aal2', amr: [{ method: 'totp', timestamp: now - 60 }] }, now)).toBe(
      true,
    );
    expect(mfaFresh({ aal: 'aal2', amr: [{ method: 'totp', timestamp: now - 301 }] }, now)).toBe(
      false,
    );
    expect(mfaFresh({ aal: 'aal1', amr: [{ method: 'totp', timestamp: now }] }, now)).toBe(false);
  });
});

describe('issue #165 migration and source contract', () => {
  it('keeps publication atomic and role devices read-only', async () => {
    const sql = await readFile(
      path.join(ROOT, 'supabase', 'migrations', '202611060003_cartridge_revisions.sql'),
      'utf8',
    );

    expect(sql).toMatch(/cartridge_revision\s+bigint not null default 0/i);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/stale_cartridge_revision/i);
    expect(sql).toMatch(/errcode = '40001'/i);
    expect(sql).toMatch(
      /revoke insert, update, delete, truncate, references, trigger\s+on public\.weddings from anon, authenticated/i,
    );
    expect(sql).toMatch(
      /revoke all on function public\.stage_deck_publish_cartridge[\s\S]*from public, anon, authenticated/i,
    );
    expect(sql).toMatch(/grant execute on function public\.stage_deck_publish_cartridge[\s\S]*to service_role/i);
    expect(sql).not.toMatch(/update public\.wedding_roles/i);
    expect(sql).not.toMatch(/update public\.role_sessions/i);
    expect(sql).not.toMatch(/update public\.role_presence/i);
    expect(sql).not.toMatch(/update public\.live_sync_state/i);
    expect(sql).not.toMatch(/delete from public\.wedding_roles/i);
  });

  it('removes the legacy secret publish path from source and configuration', async () => {
    expect(existsSync(path.join(ROOT, 'supabase', 'functions', 'publish_room'))).toBe(false);

    const env = await readFile(path.join(ROOT, '.env.example'), 'utf8');
    expect(env).not.toMatch(/DECK_PUBLISH_SECRET/);

    const adminApi = await readFile(
      path.join(ROOT, 'supabase', 'functions', 'admin_api', 'index.ts'),
      'utf8',
    );
    expect(adminApi).not.toMatch(/x-publish-secret/i);
    expect(adminApi).toMatch(/_shared\/adminPublish\.js/);
    expect(adminApi).toMatch(/_shared\/cartridgeValidator\.js/);

    const syncClient = await readFile(
      path.join(ROOT, 'src', 'lib', 'sync', 'supabaseSyncClient.js'),
      'utf8',
    );
    expect(syncClient).toMatch(/cartridge_revision/);
    expect(syncClient).toMatch(/cartridge_source/);
    expect(syncClient).toMatch(/cartridge_published_at/);
  });

  it('returns revision metadata from the admin list', async () => {
    const adminApi = await readFile(
      path.join(ROOT, 'supabase', 'functions', 'admin_api', 'index.ts'),
      'utf8',
    );
    expect(adminApi).toContain('cartridge_revision');
    expect(adminApi).toContain('cartridge_published_at');
    expect(adminApi).toContain('buildPublishAuditDetail');
  });
});
