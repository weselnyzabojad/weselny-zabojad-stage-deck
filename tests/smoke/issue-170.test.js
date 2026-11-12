import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { diffCartridges } from '../../src/lib/cartridgeDiff.js';
import {
  buildDriveSourceMetadata,
  buildPublishAuditDetail,
  driveSourceChanged,
  normalizePublishRequest,
  publishCartridge,
} from '../../supabase/functions/_shared/adminPublish.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const WEDDING_ID = '2026-08-20_test_wedding';

function mockAdmin({ existing, rpcResult }) {
  const calls = [];
  return {
    calls,
    admin: {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return { data: existing, error: null };
          },
        };
      },
      async rpc(name, args) {
        calls.push({ name, args });
        return { data: rpcResult, error: null };
      },
    },
  };
}

describe('issue #170 cartridge diff', () => {
  it('reports identity, step, speech and role-visibility changes plus live impact', () => {
    const current = {
      schemaVersion: '1.1',
      weddingId: WEDDING_ID,
      coupleProfile: {
        bride: { firstName: 'Old', nationalities: [] },
        groom: { firstName: 'Couple', nationalities: [] },
        commonLanguages: [],
      },
      date: '20.08.2026',
      syncPin: '2008',
      viewVisibility: { dj: { music: true }, photo: { photoPlan: true } },
      steps: [
        { id: 'a', title: 'Arrival' },
        { id: 'b', title: 'Dinner' },
      ],
      speeches: [{ id: 's1', order: 1 }],
    };
    const next = {
      ...current,
      coupleProfile: {
        ...current.coupleProfile,
        bride: { firstName: 'New', nationalities: [] },
      },
      viewVisibility: { dj: { music: false }, photo: { photoPlan: true } },
      steps: [
        { id: 'b', title: 'Dinner changed' },
        { id: 'c', title: 'Party' },
      ],
      speeches: [{ id: 's2', order: 1 }],
    };

    const diff = diffCartridges(current, next, {
      active_step_id: 'a',
      active_speech_id: 's1',
    });

    expect(diff.hasChanges).toBe(true);
    expect(diff.identity).toContain('coupleProfile');
    expect(diff.steps).toEqual({ added: ['c'], removed: ['a'], changed: ['b'] });
    expect(diff.speeches).toEqual({ added: ['s2'], removed: ['s1'], changed: [] });
    expect(diff.roleVisibility).toEqual(['dj']);
    expect(diff.impact).toEqual({
      activeStepId: 'a',
      activeStepRemoved: true,
      activeSpeechId: 's1',
      activeSpeechRemoved: true,
    });
  });

  it('reports no changes for equal cartridges and preserves valid active ids', () => {
    const cartridge = {
      weddingId: WEDDING_ID,
      steps: [{ id: 'a' }],
      speeches: [{ id: 's1' }],
      viewVisibility: { dj: { music: true } },
    };
    const diff = diffCartridges(cartridge, JSON.parse(JSON.stringify(cartridge)), {
      active_step_id: 'a',
      active_speech_id: 's1',
    });
    expect(diff.hasChanges).toBe(false);
    expect(diff.impact.activeStepRemoved).toBe(false);
    expect(diff.impact.activeSpeechRemoved).toBe(false);
  });
});

describe('issue #170 exact Drive source binding', () => {
  const file = {
    id: 'drive-1',
    name: 'wedding.json',
    mimeType: 'application/json',
    modifiedTime: '2026-11-06T10:00:00.000Z',
    version: '7',
    md5Checksum: 'abc',
    size: '100',
  };

  it('accepts an unchanged preview and rejects changed version/checksum', () => {
    expect(driveSourceChanged(file, { expectedVersion: '7', expectedChecksum: 'abc' })).toMatchObject({
      changed: false,
      reason: 'unchanged',
    });
    expect(driveSourceChanged(file, { expectedVersion: '8' })).toMatchObject({
      changed: true,
      reason: 'version',
    });
    expect(driveSourceChanged(file, { expectedChecksum: 'other' })).toMatchObject({
      changed: true,
      reason: 'checksum',
    });
  });

  it('stores only sanitized provenance', () => {
    const metadata = buildDriveSourceMetadata(file, {
      bytes: 100,
      retrievedAt: '2026-11-06T10:01:00.000Z',
    });
    expect(metadata).toEqual({
      provider: 'google_drive',
      driveFileId: 'drive-1',
      name: 'wedding.json',
      mimeType: 'application/json',
      modifiedTime: '2026-11-06T10:00:00.000Z',
      version: '7',
      md5Checksum: 'abc',
      size: '100',
      bytes: 100,
      retrievedAt: '2026-11-06T10:01:00.000Z',
    });
    expect(JSON.stringify(metadata)).not.toMatch(/token|private|authorization/i);
  });
});

describe('issue #170 publication metadata and audit', () => {
  const cartridge = {
    schemaVersion: '1.1',
    weddingId: WEDDING_ID,
    coupleProfile: {
      bride: { firstName: 'Test', nationalities: [] },
      groom: { firstName: 'Couple', nationalities: [] },
      commonLanguages: [],
    },
    date: '20.08.2026',
    syncPin: '2008',
    hostingMode: 'HOST_ONLY',
    culturalRules: {
      sto_lat: { status: 'YES' },
      gorzko: { status: 'STRICT_NO' },
      bread_salt: { status: 'TBC' },
    },
    steps: [{ id: 'a', time: '16:00', durationMin: 30, title: 'Arrival', type: 'FLEXIBLE', location: 'Garden' }],
  };

  it('forwards source metadata to the atomic RPC', async () => {
    const normalized = normalizePublishRequest(
      {
        weddingId: WEDDING_ID,
        couple: 'Test & Couple',
        date: '20.08.2026',
        expectedRevision: 3,
        cartridge,
        sourceMetadata: { driveFileId: 'drive-1', version: '7' },
      },
      { source: 'drive_json' },
    );
    const { admin, calls } = mockAdmin({
      existing: { room_code: 'abc123', cartridge_revision: 3, archived_at: null },
      rpcResult: {
        wedding_id: WEDDING_ID,
        room_code: 'abc123',
        created: false,
        previous_revision: 3,
        cartridge_revision: 4,
        cartridge_source: 'drive_json',
        cartridge_source_metadata: { driveFileId: 'drive-1', version: '7' },
        cartridge_published_at: '2026-11-06T12:00:00.000Z',
      },
    });

    const published = await publishCartridge({
      admin,
      request: normalized.request,
      actor: { user_id: 'owner-1' },
      validate: async (value) => ({ valid: true, errors: [], cartridge: value }),
    });

    expect(published.ok).toBe(true);
    expect(calls[0].args).toMatchObject({
      p_source: 'drive_json',
      p_source_metadata: { driveFileId: 'drive-1', version: '7' },
    });
    expect(
      buildPublishAuditDetail(published.result, normalized.request),
    ).toMatchObject({
      oldRevision: 3,
      newRevision: 4,
      source: 'drive_json',
      sourceMetadata: { driveFileId: 'drive-1', version: '7' },
    });
  });
});

describe('issue #170 migration and admin wiring contract', () => {
  it('adds atomic history backups and provenance columns', () => {
    const sql = read('supabase/migrations/202611060004_drive_publication.sql');
    expect(sql).toContain('cartridge_source_metadata jsonb');
    expect(sql).toContain('create table if not exists public.cartridge_revisions');
    expect(sql).toContain('unique (wedding_id, revision)');
    expect(sql).toContain('Automatic backup');
    expect(sql).toContain('insert into public.cartridge_revisions');
    expect(sql).toContain('p_source_metadata jsonb default null');
    expect(sql).toContain('cartridge_source_metadata = p_source_metadata');
    expect(sql).toContain('revoke all on public.cartridge_revisions from anon, authenticated');
  });

  it('requires fresh MFA, re-reads Drive and records failure audit', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("'publish_drive'");
    expect(api).toContain("'restore_revision'");
    expect(api).toContain('DESTRUCTIVE_ACTIONS');
    expect(api).toContain('driveConnector.readSource');
    expect(api).toContain('driveSourceChanged');
    expect(api).toContain('buildDriveSourceMetadata');
    expect(api).toContain("'publish_drive_failed'");
    expect(api).toContain("action === 'revision_context'");
    expect(api).toContain("source: 'backup_restore'");
    expect(api).toContain('restoredFromRevision');
    expect(api).toContain('cartridge_revisions');
  });

  it('exposes diff, exact-source publish, check and restore in the admin UI', () => {
    const panel = read('src/admin/AdminDrivePanel.jsx');
    expect(panel).toContain('diffCartridges');
    expect(panel).toContain('getRevisionContext');
    expect(panel).toContain('publishDriveRevision');
    expect(panel).toContain('checkDriveSource');
    expect(panel).toContain('onRequestMfa');
    expect(panel).toContain('expectedVersion');
    expect(panel).toContain('expectedChecksum');
    expect(panel).not.toContain('setInterval');

    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('restorePreviousRevision');
    expect(app).toContain('Restore previous');

    const drive = read('supabase/functions/admin_drive/index.ts');
    expect(drive).toContain("'check'");
    expect(drive).toContain('changed: versionChanged || checksumChanged');
    expect(drive).not.toContain('setInterval');
  });
});
