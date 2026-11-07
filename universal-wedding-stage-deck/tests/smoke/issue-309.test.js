import { describe, expect, it } from 'vitest';
import {
  applyCalculatedDurations,
  calculateStepDurations,
} from '../../src/lib/stepDurations.js';
import { sanitizeCartridge } from '../../src/lib/cartridgeImporter.js';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

describe('issue #309 automatic step durations', () => {
  it('uses the next step time for each duration', () => {
    const result = calculateStepDurations([
      { id: 'a', time: '16:30' },
      { id: 'b', time: '17:00' },
      { id: 'c', time: '18:15' },
    ]);
    expect(result.errors).toEqual([]);
    expect(result.durations).toEqual([30, 75, 15]);
  });

  it('handles midnight crossings', () => {
    const result = calculateStepDurations([
      { id: 'late', time: '23:30' },
      { id: 'midnight', time: '00:15' },
      { id: 'last', time: '01:00' },
    ]);
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
      calculateStepDurations([
        { id: 'a', time: '16:30' },
        { id: 'b', time: '16:30' },
      ]).errors[0],
    ).toContain('duplicate time');
    expect(
      calculateStepDurations([
        { id: 'a', time: '16:30' },
        { id: 'b' },
      ]).errors[0],
    ).toContain('next step has invalid or missing time');
    expect(
      calculateStepDurations([
        { id: 'a', time: '18:00' },
        { id: 'b', time: '10:00' },
      ]).errors[0],
    ).toContain('out of order');
  });

  it('applies durations to a cartridge copy', () => {
    const result = applyCalculatedDurations([
      { id: 'a', time: '16:30', durationMin: 999 },
      { id: 'b', time: '17:00', durationMin: 999 },
    ]);
    expect(result.steps[0].durationMin).toBe(30);
    expect(result.steps[1].durationMin).toBe(15);
  });

  it('calculates durations during import sanitization', () => {
    const clean = sanitizeCartridge({
      steps: [
        { id: 'a', time: '16:30', durationMin: 1, title: 'A', type: 'FLEXIBLE' },
        { id: 'b', time: '17:00', durationMin: 1, title: 'B', type: 'FLEXIBLE' },
      ],
    });
    expect(clean.steps.map((step) => step.durationMin)).toEqual([30, 15]);
  });

  it('keeps the demo cartridge durations in sync with next-step times', () => {
    const result = calculateStepDurations(DEMO_WEDDING.steps, { closureTime: '02:00' });
    expect(result.errors).toEqual([]);
    expect(DEMO_WEDDING.steps.map((step) => step.durationMin)).toEqual(result.durations);
  });
});
