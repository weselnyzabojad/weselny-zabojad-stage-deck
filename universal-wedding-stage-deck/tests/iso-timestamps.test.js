import { describe, expect, it } from 'vitest';
import {
  migrateActualTimestamps,
  normalizeActualTimestamp,
} from '../src/lib/eventTime.js';

const context = { eventDateISO: '2026-08-20', timeZone: 'Europe/Warsaw' };

describe('ISO actual timestamp edge cases', () => {
  it('preserves an ISO instant and seconds', () => {
    expect(normalizeActualTimestamp('2026-08-20T18:25:42+02:00', context)).toBe(
      '2026-08-20T16:25:42.000Z',
    );
  });

  it('migrates legacy HH:MM and HH:MM:SS', () => {
    expect(normalizeActualTimestamp('18:25', context)).toBe('2026-08-20T16:25:00.000Z');
    expect(normalizeActualTimestamp('18:25:42', context)).toBe('2026-08-20T16:25:42.000Z');
  });

  it('rolls after-midnight clocks to the next service day', () => {
    expect(normalizeActualTimestamp('00:30', context)).toBe('2026-08-20T22:30:00.000Z');
  });

  it('keeps raw legacy values when the event date is unknown', () => {
    expect(normalizeActualTimestamp('18:25', { eventDateISO: null })).toBe('18:25');
  });

  it('drops empty and invalid values', () => {
    expect(normalizeActualTimestamp('', context)).toBeNull();
    expect(normalizeActualTimestamp(null, context)).toBeNull();
    expect(normalizeActualTimestamp(42, context)).toBeNull();
  });

  it('migrates a map and filters live-state step IDs when asked', () => {
    const migrated = migrateActualTimestamps(
      { step_01: '23:50', step_02: '00:30', removed: '12:00' },
      context,
    );
    expect(migrated.step_01).toBe('2026-08-20T21:50:00.000Z');
    expect(migrated.step_02).toBe('2026-08-20T22:30:00.000Z');
    expect(migrated.removed).toBe('2026-08-20T10:00:00.000Z');

    const filtered = migrateActualTimestamps(
      { step_01: '23:50', removed: '12:00' },
      { ...context, stepIds: ['step_01'] },
    );
    expect(filtered).toEqual({ step_01: '2026-08-20T21:50:00.000Z' });
  });
});
