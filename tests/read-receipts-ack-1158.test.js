import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ACK_ROLE_GROUPS,
  latestRescheduleTarget,
  receiptRoleGroup,
  shouldAck,
} from '../src/lib/readReceipts.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const liveState = (change = {}, updatedAt = '2026-11-17T20:00:10.000Z') => ({
  media_overrides: {
    steps: {
      value: [],
      updatedAt,
      deviceId: 'device-mc',
      change: {
        kind: 'reschedule',
        stepId: 'step-first-dance',
        stepTitle: 'Première danse',
        from: '20:15',
        to: '20:30',
        authorRole: 'mc',
        at: '2026-11-17T20:00:00.000Z',
        ...change,
      },
    },
  },
});

describe('read-receipt helpers (issue #1158)', () => {
  it('groups every acknowledging role under the four MC badges', () => {
    expect(ACK_ROLE_GROUPS).toEqual({
      dj: ['dj', 'dj_mc'],
      photo: ['photo1', 'photo2', 'video'],
      musician: ['musician'],
      venue: ['venue_manager'],
    });
    expect(receiptRoleGroup('video')).toBe('photo');
    expect(receiptRoleGroup('dj_mc')).toBe('dj');
    expect(receiptRoleGroup('mc')).toBeNull();
    expect(receiptRoleGroup('speaker')).toBeNull();
  });

  it('returns the latest reschedule target regardless of the active step', () => {
    expect(latestRescheduleTarget(liveState())).toEqual({
      stepId: 'step-first-dance',
      revision: '2026-11-17T20:00:00.000Z',
      stepTitle: 'Première danse',
    });
  });

  it('ignores undo, other overrides, missing step and missing revision', () => {
    expect(latestRescheduleTarget(null)).toBeNull();
    expect(latestRescheduleTarget({})).toBeNull();
    expect(latestRescheduleTarget(liveState({ kind: 'undo' }))).toBeNull();
    expect(latestRescheduleTarget(liveState({ kind: 'media_override' }))).toBeNull();
    expect(latestRescheduleTarget(liveState({ stepId: '' }))).toBeNull();
    const missingRevision = liveState({ at: undefined });
    delete missingRevision.media_overrides.steps.updatedAt;
    expect(latestRescheduleTarget(missingRevision)).toBeNull();
  });

  it('acks once per revision, only when enabled and visible', () => {
    const base = { enabled: true, key: 'step@rev', ackedKey: null, inFlight: false, visible: true };
    expect(shouldAck(base)).toBe(true);
    expect(shouldAck({ ...base, enabled: false })).toBe(false);
    expect(shouldAck({ ...base, key: null })).toBe(false);
    expect(shouldAck({ ...base, visible: false })).toBe(false);
    expect(shouldAck({ ...base, ackedKey: 'step@rev' })).toBe(false);
    expect(shouldAck({ ...base, inFlight: true })).toBe(false);
  });
});

describe('provider acknowledgement wiring', () => {
  const hook = read('src/hooks/useReadReceipt.js');
  const stage = read('src/StageDeck.jsx');

  it('listens to visibility and the first local interaction, then cleans up', () => {
    expect(hook).toContain("'visibilitychange'");
    for (const event of ['pointerdown', 'touchstart', 'keydown', 'scroll']) {
      expect(hook).toContain(`'${event}'`);
    }
    expect(hook).toContain('document.removeEventListener(event, onInteraction)');
    expect(hook).toContain('shouldAck');
    expect(hook).toContain('client.ackStepReceipt({ stepId, revision })');
    expect(hook).toContain('mountedRef.current = false');
  });

  it('derives one target and passes it to the four acknowledging views', () => {
    expect(stage).toContain('latestRescheduleTarget(liveState)');
    expect(stage).toContain('createSupabaseSyncClient(syncConfig');
    expect(stage.match(/receiptTarget=\{receiptTarget\}/g)).toHaveLength(4);
    expect(stage.match(/receiptClient=\{receiptClient\}/g)).toHaveLength(4);
  });

  it('calls the hook in every acknowledging view and not in MC/Speaker', () => {
    for (const file of [
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/VenueManagerView.jsx',
      'src/components/MusicianView.jsx',
    ]) {
      expect(read(file)).toContain('useReadReceipt({');
    }
    expect(read('src/views/McMasterView.jsx')).not.toContain('useReadReceipt');
    expect(read('src/components/SpeakerView.jsx')).not.toContain('useReadReceipt');
  });
});
