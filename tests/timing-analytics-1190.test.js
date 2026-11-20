import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildTimingComparison,
  calculateTimeDelta,
  timingStatus,
} from '../src/lib/timingAnalytics.js';
import { createLiveState, markStepDone } from '../src/lib/liveStageState.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const steps = [
  { id: 'arrival', time: '18:00', title: 'Arrival' },
  { id: 'dinner', time: '19:00', title: 'Dinner' },
  { id: 'closure', time: '20:00', title: 'Closure', mandatory: { kind: 'CLOSURE' } },
];

describe('issue #1190 timing analytics', () => {
  it('calculates deltas for HH:MM and ISO actual timestamps', () => {
    expect(calculateTimeDelta('18:00', '18:07')).toBe(7);
    expect(calculateTimeDelta('18:00', '2026-08-20T18:07:00+02:00')).toBe(7);
    expect(calculateTimeDelta('23:50', '00:10')).toBe(20);
    expect(calculateTimeDelta('18:00', 'bad')).toBeNull();
    expect(calculateTimeDelta('bad', '18:00')).toBeNull();
  });

  it('uses inclusive ±5 status boundaries', () => {
    expect(timingStatus(5, true)).toBe('on-time');
    expect(timingStatus(-5, true)).toBe('on-time');
    expect(timingStatus(6, true)).toBe('late');
    expect(timingStatus(-6, true)).toBe('early');
    expect(timingStatus(null, false)).toBe('missing');
  });

  it('builds ordered rows with planned and actual durations', () => {
    const result = buildTimingComparison(
      steps,
      {
        actual_timestamps: {
          arrival: '18:07',
          dinner: '19:12',
          closure: '20:10',
        },
      },
      { closureTime: '23:00' },
    );

    expect(result.rows.map((row) => row.id)).toEqual(['arrival', 'dinner', 'closure']);
    expect(result.rows[0]).toMatchObject({
      plannedStart: '18:00',
      actualStart: '18:07',
      plannedDurationMin: 60,
      actualDurationMin: 65,
      deltaMinutes: 7,
      status: 'late',
    });
    expect(result.rows[2]).toMatchObject({
      actualDurationMin: 170,
      status: 'late',
    });
    expect(result.summary).toMatchObject({
      totalSteps: 3,
      measured: 3,
      late: 3,
      onTime: 0,
      early: 0,
      missing: 0,
      firstActual: '18:07',
      lastActual: '20:10',
      totalLateness: 29,
      totalEarly: 0,
      toleranceMin: 5,
    });
  });

  it('keeps a missing first actual as missing and never crashes', () => {
    const result = buildTimingComparison(steps, {
      actual_timestamps: { dinner: '2026-08-20T19:02:00+02:00' },
    });
    expect(result.rows[0].status).toBe('missing');
    expect(result.rows[0].actualDurationMin).toBeNull();
    expect(result.rows[1].status).toBe('on-time');
    expect(result.rows[1].deltaMinutes).toBe(2);
    expect(result.rows[2].status).toBe('missing');
    expect(result.summary.missing).toBe(2);
  });

  it('handles cross-midnight rows and an empty list', () => {
    const midnight = buildTimingComparison(
      [
        { id: 'late', time: '23:50', title: 'Late' },
        { id: 'after', time: '00:10', title: 'After' },
        { id: 'close', time: '02:00', title: 'Close', mandatory: { kind: 'CLOSURE' } },
      ],
      { actual_timestamps: { late: '23:55', after: '00:15', close: '02:05' } },
    );
    expect(midnight.rows[0].deltaMinutes).toBe(5);
    expect(midnight.rows[1].deltaMinutes).toBe(5);
    expect(midnight.rows[0].actualDurationMin).toBe(20);

    const empty = buildTimingComparison([], {});
    expect(empty.rows).toEqual([]);
    expect(empty.summary.totalSteps).toBe(0);
  });

  it('keeps markStepDone writing ISO timestamps for the next step', () => {
    const now = new Date('2026-08-20T18:12:00.000Z');
    const state = createLiveState(steps);
    const next = markStepDone(state, steps, now, { role: 'mc' });
    expect(next.actual_timestamps.dinner).toBe(now.toISOString());
  });

  it('makes the recap table use the shared status helper', () => {
    const page = read('src/components/WeddingRecapPage.jsx');
    expect(page).toContain('timingStatus');
    expect(page).toContain('data-timing-status');
    expect(page).toContain("timing === 'late'");
  });
});
