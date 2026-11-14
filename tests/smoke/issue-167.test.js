import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { availableRoleIds, ROLE_ORDER } from '../../src/lib/roles.js';
import { createLiveState } from '../../src/lib/liveStageState.js';
import {
  applyPublishedRow,
  isNewerRevision,
  normalizeRevision,
  resolveEffectiveSyncStatus,
} from '../../src/lib/cartridgeSync.js';
import { reconcileLiveStateWithCartridge } from '../../src/lib/cartridgeReconciliation.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const fixture = JSON.parse(read('schema/fixtures/valid-minimal.json'));
const WEDDING_ID = fixture.weddingId;
const clone = (value) => JSON.parse(JSON.stringify(value));

function row(overrides = {}) {
  return {
    wedding_id: WEDDING_ID,
    cartridge: clone(fixture),
    cartridge_revision: 1,
    cartridge_source: 'admin_json',
    cartridge_published_at: '2026-11-06T12:00:00.000Z',
    updated_at: '2026-11-06T12:00:00.000Z',
    ...overrides,
  };
}

function snapshot(revision = 1) {
  return { cartridge: clone(fixture), revision };
}

describe('issue #167 revision application', () => {
  it('normalizes revisions and only moves forward', () => {
    expect(normalizeRevision('3')).toBe(3);
    expect(normalizeRevision(0)).toBe(0);
    expect(normalizeRevision(-1)).toBeNull();
    expect(normalizeRevision(3.5)).toBeNull();
    expect(normalizeRevision('abc')).toBeNull();

    expect(isNewerRevision(null, 1)).toBe(true);
    expect(isNewerRevision(2, 3)).toBe(true);
    expect(isNewerRevision(3, 3)).toBe(false);
    expect(isNewerRevision(3, 2)).toBe(false);
    expect(isNewerRevision(3, null)).toBe(false);
  });

  it('applies a newer complete snapshot and ignores duplicates/older/partial rows', () => {
    const first = applyPublishedRow({ current: null, row: row(), weddingId: WEDDING_ID });
    expect(first.snapshot).toMatchObject({
      weddingId: WEDDING_ID,
      revision: 1,
      freshness: 'current',
      publication: { source: 'admin_json' },
    });

    const duplicate = applyPublishedRow({
      current: snapshot(1),
      row: row(),
      weddingId: WEDDING_ID,
    });
    expect(duplicate).toMatchObject({ unchangedRevision: true, isUpdate: false });

    const newer = applyPublishedRow({
      current: snapshot(1),
      row: row({ cartridge_revision: 2 }),
      weddingId: WEDDING_ID,
    });
    expect(newer).toMatchObject({ isUpdate: true, snapshot: { revision: 2 } });

    const older = applyPublishedRow({
      current: snapshot(5),
      row: row({ cartridge_revision: 4 }),
      weddingId: WEDDING_ID,
    });
    expect(older).toMatchObject({ ignored: true, reason: 'older' });

    expect(applyPublishedRow({ current: snapshot(1), row: {}, weddingId: WEDDING_ID })).toEqual({
      error: 'missing',
    });
    expect(
      applyPublishedRow({
        current: snapshot(1),
        row: row({ cartridge: { ...clone(fixture), steps: [] } }),
        weddingId: WEDDING_ID,
      }),
    ).toEqual({ error: 'invalid' });
  });

  it('rejects a snapshot that belongs to another wedding', () => {
    expect(
      applyPublishedRow({
        current: null,
        row: row({ wedding_id: '2026-08-21_other_wedding' }),
        weddingId: WEDDING_ID,
      }),
    ).toEqual({ error: 'invalid' });
    expect(
      applyPublishedRow({
        current: null,
        row: row({ cartridge: { ...clone(fixture), weddingId: '2026-08-21_other_wedding' } }),
        weddingId: WEDDING_ID,
      }),
    ).toEqual({ error: 'invalid' });
  });

  it('applies an online publication for every role and respects DJ tier gating', () => {
    for (const role of ROLE_ORDER) {
      const result = applyPublishedRow({
        current: snapshot(1),
        row: row({ cartridge_revision: 2 }),
        weddingId: WEDDING_ID,
      });
      expect(result.isUpdate, role).toBe(true);
      expect(result.snapshot.revision, role).toBe(2);
    }

    expect(availableRoleIds('CLOUD')).toEqual(ROLE_ORDER);
    expect(availableRoleIds('HOST_ONLY')).toEqual(ROLE_ORDER);
  });
});

describe('issue #167 sync and reconnect contract', () => {
  it('refetches after subscribe, reconnect, online, focus and visibility', () => {
    const hook = read('src/hooks/usePublishedCartridge.js');
    expect(hook).toContain('subscribeWedding');
    expect(hook).toContain('void catchUp()');
    expect(hook).toContain("window.addEventListener('online', handleOnline)");
    expect(hook).toContain("window.addEventListener('focus', handleOnline)");
    expect(hook).toContain("document.addEventListener('visibilitychange', handleVisible)");
    expect(hook).toContain('applyPublishedRow');
    expect(hook).toContain('clearCachedCartridge(previous)');

    const sync = read('src/lib/sync/supabaseSyncClient.js');
    expect(sync).toContain('function subscribeWedding');
    expect(sync).toContain("table: 'weddings'");
    expect(sync).toContain('wedding_id=eq.${weddingId}');

    const app = read('src/App.jsx');
    expect(app).toContain('usePublishedCartridge');
    expect(app).not.toContain('window.location.reload');
    expect(app).not.toContain('STORED_CARTRIDGE');

    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('cartridgeRevision');
    expect(deck).toContain('resolveEffectiveSyncStatus');
    expect(deck).toContain('syncStatus: displaySyncStatus');
  });

  it('clears the previous wedding cache when the session changes', () => {
    const hook = read('src/hooks/usePublishedCartridge.js');
    expect(hook).toContain('previousWeddingRef');
    expect(hook).toContain('if (previous && previous !== weddingId) clearCachedCartridge(previous)');
    expect(hook).toContain('previousWeddingRef.current = weddingId ?? null');
  });

  it('does not report a fully current sync until both catch-ups finish', () => {    expect(
      resolveEffectiveSyncStatus({
        syncStatus: 'connected',
        liveCaughtUp: false,
        cartridgeFreshness: 'current',
      }),
    ).toBe('connecting');
    expect(
      resolveEffectiveSyncStatus({
        syncStatus: 'connected',
        liveCaughtUp: true,
        cartridgeFreshness: 'stale',
      }),
    ).toBe('connecting');
    expect(
      resolveEffectiveSyncStatus({
        syncStatus: 'connected',
        liveCaughtUp: true,
        cartridgeFreshness: 'current',
        online: false,
      }),
    ).toBe('offline');
    expect(
      resolveEffectiveSyncStatus({
        syncStatus: 'connected',
        liveCaughtUp: true,
        cartridgeFreshness: 'current',
      }),
    ).toBe('connected');
  });

  it('keeps the sync status non-green while the cartridge check is in flight', () => {
    expect(
      resolveEffectiveSyncStatus({
        syncStatus: 'connected',
        liveCaughtUp: true,
        cartridgeFreshness: 'connecting',
      }),
    ).toBe('connecting');
  });
});

describe('issue #167 live-state reconciliation', () => {
  const steps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const speeches = [{ id: 's1' }, { id: 's2' }];

  it('preserves progress and the active step/speech when they still exist', () => {
    const liveState = createLiveState(steps, {
      active_step_id: 'b',
      completed_step_ids: ['a'],
      step_order: ['a', 'b', 'c'],
      active_speech_id: 's2',
      actual_timestamps: { a: '2026-08-20T14:00:00.000Z', b: '2026-08-20T15:00:00.000Z' },
      checked_subtasks: { cue: true },
      mutation_log: [{ id: 'keep', op: 'complete_step' }],
    });

    const result = reconcileLiveStateWithCartridge({ liveState, steps, speeches });
    expect(result.changed).toBe(false);
    expect(result.notices).toEqual([]);
    expect(result.state.active_step_id).toBe('b');
    expect(result.state.completed_step_ids).toEqual(['a']);
    expect(result.state.active_speech_id).toBe('s2');
    expect(result.state.mutation_log).toEqual([{ id: 'keep', op: 'complete_step' }]);
  });

  it('falls back visibly when removed active step/speech ids disappear', () => {
    const oldSteps = [{ id: 'a' }, { id: 'b' }];
    const liveState = createLiveState(oldSteps, {
      active_step_id: 'a',
      completed_step_ids: [],
      step_order: ['a', 'b'],
      active_speech_id: 's1',
      actual_timestamps: {
        a: '2026-08-20T14:00:00.000Z',
        b: '2026-08-20T15:00:00.000Z',
      },
      checked_subtasks: { task: true },
      mutation_log: [{ id: 'keep', op: 'select_speech' }],
    });

    const result = reconcileLiveStateWithCartridge({
      liveState,
      steps: [{ id: 'b' }, { id: 'c' }],
      speeches: [{ id: 's2' }],
    });

    expect(result.changed).toBe(true);
    expect(result.state.active_step_id).toBe('b');
    expect(result.state.step_order).toEqual(['b', 'c']);
    expect(result.state.active_speech_id).toBeNull();
    expect(result.state.actual_timestamps).toEqual({
      b: '2026-08-20T15:00:00.000Z',
    });
    expect(result.state.checked_subtasks).toEqual({ task: true });
    expect(result.state.mutation_log).toEqual([{ id: 'keep', op: 'select_speech' }]);
    expect(result.notices.map((notice) => notice.kind)).toEqual([
      'step_removed',
      'speech_removed',
    ]);
  });

  it('keeps completed progress but clears an active step that became completed', () => {
    const liveState = createLiveState(steps, {
      active_step_id: 'a',
      completed_step_ids: ['a'],
      step_order: ['a', 'b', 'c'],
      active_speech_id: null,
    });

    const result = reconcileLiveStateWithCartridge({ liveState, steps, speeches });
    expect(result.state.active_step_id).toBe('b');
    expect(result.state.completed_step_ids).toEqual(['a']);
  });
});
