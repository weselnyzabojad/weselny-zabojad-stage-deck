import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DriftPill from '../../src/components/DriftPill.jsx';
import { buildDriftReport } from '../../src/lib/driftEngine.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const steps = [
  { id: 'a', time: '16:00', durationMin: 30, title: 'A', type: 'FLEXIBLE' },
  { id: 'b', time: '16:30', durationMin: 30, title: 'B', type: 'FLEXIBLE' },
];
const context = { eventDateISO: '2026-08-20', timeZone: 'UTC' };
const at = (time) => new Date(`2026-08-20T${time}:00Z`);
const report = (actual, now) => buildDriftReport(steps, {
  active_step_id: 'a',
  completed_step_ids: [],
  actual_timestamps: actual ? { a: `2026-08-20T${actual}:00Z` } : {},
}, { ...context, now: at(now) });

describe('issue #524 corrected MC LATE value', () => {
  it('adds live overrun to the step-start drift', () => {
    const current = report('16:10', '16:45');
    expect(current.drift.startDriftMinutes).toBe(10);
    expect(current.liveOverrunMinutes).toBe(5);
    expect(current.canonicalDriftMinutes).toBe(15);
    expect(current.canonicalDriftTone).toBe('late');
    expect(current.canonicalDriftLabel).toContain('15');
  });

  it('increases while an on-time step overruns', () => {
    expect(report('16:00', '16:20').canonicalDriftMinutes).toBe(0);
    expect(report('16:00', '16:50').canonicalDriftMinutes).toBe(20);
  });

  it('keeps an early start early until the overrun catches up', () => {
    expect(report('15:55', '16:10').canonicalDriftMinutes).toBe(-5);
    expect(report('15:55', '16:30').canonicalDriftMinutes).toBe(0);
    expect(report('15:55', '16:45').canonicalDriftMinutes).toBe(15);
  });

  it('shows no misleading number before an actual start exists', () => {
    const current = report(null, '16:20');
    expect(current.canonicalDriftMinutes).toBe(null);
    expect(current.canonicalDriftLabel).toBe(null);
  });

  it('renders the corrected value in the compact pill', () => {
    const current = report('16:10', '16:45');
    const html = renderToStaticMarkup(
      createElement(DriftPill, { drift: current.drift, compact: true }),
    );
    expect(html).toContain('+15 min');
    expect(html).not.toContain('+10 min');
  });

  it('keeps the #416 undo freeze and one canonical source', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('setFrozenLateDrift(driftReport.drift)');
    expect(deck).toContain('setFrozenLateDrift(null)');
    expect(read('src/lib/driftEngine.js')).toContain('startDriftMinutes + liveOverrunMinutes');
  });
});
