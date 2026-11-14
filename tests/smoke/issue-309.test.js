import { describe, expect, it } from 'vitest';
import {
  calculateStepDurations,
} from '../../src/lib/stepDurations.js';
import { sanitizeCartridge } from '../../src/lib/cartridgeImporter.js';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

describe('issue #309 automatic step durations', () => {
  it('uses the next step time for each duration', () => {
    const result = calculateStepDurations(
      [
        { id: 'a', time: '16:30' },
        { id: 'b', time: '17:00' },
        { id: 'c', time: '18:15' },
      ],
      { closureTime: '18:45' },
    );
    expect(result.errors).toEqual([]);
    expect(result.durations).toEqual([30, 75, 30]);
  });

  it('handles midnight crossings', () => {
    const result = calculateStepDurations(
      [
        { id: 'late', time: '23:30' },
        { id: 'midnight', time: '00:15' },
        { id: 'last', time: '01:00' },
      ],
      { closureTime: '01:15' },
    );
    expect(result.errors).toEqual([]);
    expect(result.durations).toEqual([45, 45, 15]);
  });

  it('derives the final step duration from the closure time', () => {
    const result = calculateStepDurations(
      [
        { id: 'games', time: '01:00' },
      ],
      { closureTime: '02:00' },
    );
    expect(result.errors).toEqual([]);
    expect(result.durations).toEqual([60]);
  });

  it('fails safely on duplicate, missing and out-of-order times', () => {
    expect(
      calculateStepDurations(
        [
          { id: 'a', time: '16:30' },
          { id: 'b', time: '16:30' },
        ],
        { closureTime: '17:00' },
      ).errors[0],
    ).toContain('duplicate time');
    expect(
      calculateStepDurations(
        [
          { id: 'a', time: '16:30' },
          { id: 'b' },
        ],
        { closureTime: '17:00' },
      ).errors[0],
    ).toContain('next step has invalid or missing time');
    expect(
      calculateStepDurations(
        [
          { id: 'a', time: '18:00' },
          { id: 'b', time: '10:00' },
        ],
        { closureTime: '19:00' },
      ).errors[0],
    ).toContain('out of order');
  });

  it('requires closure for the final step instead of defaulting to 15 minutes', () => {
    const result = calculateStepDurations([{ id: 'last', time: '01:00' }]);
    expect(result.durations).toEqual([null]);
    expect(result.errors[0]).toContain('closureTime is required');
  });

  it('strips legacy durationMin during import sanitization', () => {
    const clean = sanitizeCartridge({
      steps: [
        { id: 'a', time: '16:30', durationMin: 1, title: 'A', type: 'FLEXIBLE' },
        { id: 'b', time: '17:00', durationMin: 1, title: 'B', type: 'FLEXIBLE' },
        {
          id: 'closure',
          time: '02:00',
          title: 'Closure',
          type: 'HARD_ANCHOR',
          mandatory: { kind: 'CLOSURE', label: 'Wedding closure' },
        },
      ],
    });
    expect(clean.steps.every((step) => !('durationMin' in step))).toBe(true);
  });

  it('keeps demo steps free of stored durations and derives them at runtime', () => {
    expect(DEMO_WEDDING.steps.every((step) => !('durationMin' in step))).toBe(true);
    const result = calculateStepDurations(DEMO_WEDDING.steps, { closureTime: '02:00' });
    expect(result.errors).toEqual([]);
    expect(result.durations.every((duration) => duration == null || duration >= 0)).toBe(true);
  });
});
