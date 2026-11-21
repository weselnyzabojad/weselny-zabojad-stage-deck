import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildTimelineContext,
  timelineDocUrl,
  timelineSyncStatus,
} from '../supabase/functions/_shared/timelineContext.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1376 admin timeline context and sync status', () => {
  it('adds nullable sync columns without rewriting existing weddings', () => {
    const migration = read('supabase/migrations/202611210004_timeline_sync_columns.sql');
    expect(migration).toContain('add column if not exists timeline_doc_synced_revision integer');
    expect(migration).toContain('add column if not exists timeline_doc_synced_at timestamptz');
  });

  it('computes unlinked, pending and synced statuses', () => {
    expect(timelineSyncStatus({ templateDocId: null, syncedRevision: null, currentRevision: 3 })).toBe(
      'unlinked',
    );
    expect(
      timelineSyncStatus({ templateDocId: 'doc', syncedRevision: 2, currentRevision: 3 }),
    ).toBe('pending');
    expect(
      timelineSyncStatus({ templateDocId: 'doc', syncedRevision: null, currentRevision: 3 }),
    ).toBe('pending');
    expect(
      timelineSyncStatus({ templateDocId: 'doc', syncedRevision: 3, currentRevision: 3 }),
    ).toBe('synced');
  });

  it('builds the context shape and Doc URL', () => {
    const context = buildTimelineContext({
      wedding_id: 'Test&Couple-UM-2026-01-001',
      couple: 'Test & Couple',
      date: '20.08.2026',
      cartridge: { schemaVersion: '1.1' },
      cartridge_revision: 4,
      template_doc_id: 'abc123',
      timeline_doc_synced_revision: 3,
      timeline_doc_synced_at: '2026-11-21T10:00:00Z',
    });
    expect(context).toMatchObject({
      weddingId: 'Test&Couple-UM-2026-01-001',
      cartridgeRevision: 4,
      templateDocId: 'abc123',
      docUrl: 'https://docs.google.com/document/d/abc123/edit',
      syncedRevision: 3,
      status: 'pending',
    });
    expect(timelineDocUrl(null)).toBeNull();
  });

  it('wires the authenticated admin action to the context builder', () => {
    const source = read('supabase/functions/admin_api/index.ts');
    expect(source).toContain("if (action === 'timeline_context')");
    expect(source).toContain("'wedding_id, couple, date, cartridge, cartridge_revision, template_doc_id, timeline_doc_synced_revision, timeline_doc_synced_at'");
    expect(source).toContain('return json(buildTimelineContext(row));');
  });

  it('keeps Save on the existing atomic publish path', () => {
    const source = read('supabase/functions/admin_api/index.ts');
    expect(source).toContain("if (action === 'publish')");
    expect(source).toContain('publishCartridge({');
    expect(source).toContain('expectedRevision');
  });
});
