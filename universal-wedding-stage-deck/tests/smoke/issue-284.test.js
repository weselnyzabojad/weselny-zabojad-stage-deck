import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyTimeAwareStart } from '../../src/lib/timeTimeline.js';

const entries = [
  { step: { id: 'step_00', time: '15:30' }, isDone: true, isActive: false },
  { step: { id: 'step_01', time: '16:30' }, isDone: true, isActive: false },
  { step: { id: 'step_02', time: '17:00' }, isDone: false, isActive: true },
];

const context = { eventDateISO: '2026-11-07', timeZone: 'UTC' };

describe('issue #284 time-derived timeline start', () => {
  it('shows no completed steps and first step current before start', () => {
    const result = applyTimeAwareStart(entries, { now: new Date('2026-11-07T10:00:00Z'), ...context });
    expect(result.every((entry) => entry.isDone === false)).toBe(true);
    expect(result[0].isActive).toBe(true);
    expect(result.slice(1).every((entry) => entry.isActive === false)).toBe(true);
  });

  it('leaves entries untouched after the first step starts', () => {
    const now = new Date('2026-11-07T16:00:00Z');
    expect(applyTimeAwareStart(entries, { now, ...context })).toBe(entries);
  });

  it('is wired into StageDeck', () => {
    const source = readFileSync(new URL('../../src/StageDeck.jsx', import.meta.url), 'utf8');
    expect(source).toContain('applyTimeAwareStart');
  });
});
