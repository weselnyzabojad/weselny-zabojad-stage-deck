import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildStageRail, stageRailSummary } from '../src/lib/stageRail.js';
import StageRail from '../src/components/StageRail.jsx';
import StageStepCard from '../src/components/StageStepCard.jsx';

function entry(index, overrides = {}) {
  return {
    index,
    step: {
      id: `step_${index}`,
      title: `Step ${index}`,
      location: `Room ${index}`,
      type: 'ELASTIC',
      durationMin: 15,
      ...overrides.step,
    },
    isActive: false,
    isDone: false,
    projectedStart: `1${index}:00`,
    projectedEnd: `1${index}:15`,
    ...overrides,
  };
}

function timeline(length, activeAt) {
  return Array.from({ length }, (_, index) =>
    entry(index, {
      isActive: index === activeAt,
      isDone: activeAt == null ? true : index < activeAt,
    }),
  );
}

describe('buildStageRail', () => {
  it('returns empty zones for an empty timeline', () => {
    expect(buildStageRail([], -1)).toEqual({ done: [], current: null, upcoming: [] });
    expect(buildStageRail(undefined)).toEqual({ done: [], current: null, upcoming: [] });
  });

  it('reverses completed steps and keeps upcoming in order', () => {
    const entries = timeline(5, 2);
    const rail = buildStageRail(entries, 2);

    expect(rail.done.map((item) => item.index)).toEqual([1, 0]);
    expect(rail.current.index).toBe(2);
    expect(rail.upcoming.map((item) => item.index)).toEqual([3, 4]);
  });

  it('handles a single active step', () => {
    const rail = buildStageRail(timeline(1, 0), 0);
    expect(rail.done).toEqual([]);
    expect(rail.current.index).toBe(0);
    expect(rail.upcoming).toEqual([]);
  });

  it('handles the last step being active', () => {
    const rail = buildStageRail(timeline(3, 2), 2);
    expect(rail.done.map((item) => item.index)).toEqual([1, 0]);
    expect(rail.current.index).toBe(2);
    expect(rail.upcoming).toEqual([]);
  });

  it('treats an all-done timeline as completed with no current step', () => {
    const rail = buildStageRail(timeline(3, null), -1);
    expect(rail.done.map((item) => item.index)).toEqual([2, 1, 0]);
    expect(rail.current).toBeNull();
    expect(rail.upcoming).toEqual([]);
  });

  it('treats a partially done, inactive timeline as upcoming', () => {
    const entries = [
      entry(0, { isDone: false }),
      entry(1, { isDone: false }),
    ];
    const rail = buildStageRail(entries, -1);
    expect(rail.done).toEqual([]);
    expect(rail.current).toBeNull();
    expect(rail.upcoming.map((item) => item.index)).toEqual([0, 1]);
  });

  it('derives the active index when none is passed', () => {
    const rail = buildStageRail(timeline(4, 1));
    expect(rail.current.index).toBe(1);
  });
});

describe('stageRailSummary', () => {
  it('joins start and end', () => {
    expect(stageRailSummary(entry(0))).toBe('10:00–10:15');
  });

  it('falls back to the planned time', () => {
    expect(stageRailSummary({ step: { time: '21:30' } })).toBe('21:30');
  });

  it('uses an em dash when nothing is known', () => {
    expect(stageRailSummary({})).toBe('—');
    expect(stageRailSummary(null)).toBe('—');
  });
});

describe('stage rail rendering', () => {
  it('renders the three zones with titles and status chips', () => {
    const rail = buildStageRail(timeline(3, 1), 1);
    const html = renderToStaticMarkup(
      createElement(StageRail, {
        done: rail.done,
        current: rail.current,
        upcoming: rail.upcoming,
      }),
    );

    expect(html).toContain('Completed steps');
    expect(html).toContain('Current step');
    expect(html).toContain('Upcoming steps');
    expect(html).toContain('Step 0');
    expect(html).toContain('Step 1');
    expect(html).toContain('Step 2');
    expect(html).toContain('ON AIR');
    expect(html).toContain('NEXT');
  });

  it('shows empty states when there is no active step', () => {
    const html = renderToStaticMarkup(
      createElement(StageRail, { done: [], current: null, upcoming: [] }),
    );
    expect(html).toContain('No active step.');
    expect(html).toContain('No steps completed yet.');
    expect(html).toContain('No further steps');
  });

  it('renders a done card with its drift chip', () => {
    const html = renderToStaticMarkup(
      createElement(StageStepCard, {
        entry: entry(0, { isDone: true, projectedDriftMinutes: 4, driftLabel: '4 min late' }),
        variant: 'done',
      }),
    );
    expect(html).toContain('DONE');
    expect(html).toContain('+4m');
    expect(html).toContain('Room 0');
  });

  it('renders nothing for a missing step', () => {
    expect(renderToStaticMarkup(createElement(StageStepCard, { entry: {}, variant: 'done' }))).toBe('');
  });
});
