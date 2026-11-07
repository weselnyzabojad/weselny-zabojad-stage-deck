import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildStageRail,
  nextFocusIndex,
  stageRailSummary,
  toggleRailOpen,
} from '../src/lib/stageRail.js';
import { setLocale } from '../src/i18n/index.js';
import StageRail from '../src/components/StageRail.jsx';
import StageStepCard from '../src/components/StageStepCard.jsx';

afterEach(() => {
  setLocale('en', { persist: false });
});

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

  it('renders the current body inside the hero card', () => {
    const html = renderToStaticMarkup(
      createElement(StageRail, {
        current: entry(1),
        currentBody: createElement('p', null, 'Hero cue content'),
      }),
    );
    expect(html).toContain('Hero cue content');
  });
});

describe('rail accordion behaviour (#120)', () => {
  it('keeps one open card per rail and toggles closed', () => {
    let state = toggleRailOpen({}, 'done', 'a');
    expect(state.done).toBe('a');
    state = toggleRailOpen(state, 'done', 'b');
    expect(state.done).toBe('b');
    state = toggleRailOpen(state, 'done', 'b');
    expect(state.done).toBeNull();
  });

  it('keeps the done and upcoming zones independent', () => {
    let state = toggleRailOpen({}, 'done', 'a');
    state = toggleRailOpen(state, 'upcoming', 'z');
    expect(state.done).toBe('a');
    expect(state.upcoming).toBe('z');
  });
});

describe('rail keyboard roving (#120)', () => {
  it('wraps ArrowDown/ArrowUp and handles Home/End', () => {
    expect(nextFocusIndex('ArrowDown', 2, 3)).toBe(0);
    expect(nextFocusIndex('ArrowUp', 0, 3)).toBe(2);
    expect(nextFocusIndex('Home', 2, 3)).toBe(0);
    expect(nextFocusIndex('End', 0, 3)).toBe(2);
  });

  it('ignores non-navigation keys and invalid indexes', () => {
    expect(nextFocusIndex('Tab', 0, 3)).toBe(-1);
    expect(nextFocusIndex('ArrowDown', -1, 3)).toBe(-1);
    expect(nextFocusIndex('ArrowDown', 0, 0)).toBe(-1);
  });
});

describe('rail accessibility and i18n (#120)', () => {
  it('renders disclosure buttons for side rails only', () => {
    const rail = buildStageRail(timeline(3, 1), 1);
    const html = renderToStaticMarkup(
      createElement(StageRail, {
        done: rail.done,
        current: rail.current,
        upcoming: rail.upcoming,
      }),
    );
    expect(html.match(/aria-expanded/g)?.length).toBe(2);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls');
    expect(html).toContain('data-rail-card');
    expect(html).toContain('motion-reduce:transition-none');
  });

  it('localises the rail in French', () => {
    setLocale('fr', { persist: false });
    const rail = buildStageRail(timeline(2, 0), 0);
    const html = renderToStaticMarkup(
      createElement(StageRail, {
        done: rail.done,
        current: rail.current,
        upcoming: rail.upcoming,
      }),
    );
    expect(html).toContain('Étapes terminées');
    expect(html).toContain('Étape en cours');
    expect(html).toContain('EN DIRECT');
  });

  it('localises the rail in Polish', () => {
    setLocale('pl', { persist: false });
    const rail = buildStageRail(timeline(2, 0), 0);
    const html = renderToStaticMarkup(
      createElement(StageRail, {
        done: rail.done,
        current: rail.current,
        upcoming: rail.upcoming,
      }),
    );
    expect(html).toContain('Ukończone kroki');
    expect(html).toContain('Bieżący krok');
    expect(html).toContain('NA ANTENIE');
  });
});

describe('MC dashboard rail integration (#119)', () => {
  it('derives the shared focus stack from drift entries and passes the hero body', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(new URL('../src/views/McMasterView.jsx', import.meta.url), 'utf8');

    expect(source).toContain('driftReport.entries');
    expect(source).toContain('railActiveIndex');
    expect(source).toContain('<TimelineFocusStack');
    expect(source).toContain('currentBody={heroBody}');
    expect(source).toContain('Catering & Sub-Tasks');
    expect(source).not.toContain('MAIN DASHBOARD (70% / 30% SPLIT)');
  });
});

describe('rail responsive and theme polish (#121)', () => {
  const readSource = async (path) => {
    const { readFileSync } = await import('node:fs');
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  };

  it('degrades from three zones to tablet columns and phone stack', async () => {
    const source = await readSource('src/components/TimelineFocusStack.jsx');
    expect(source).toContain('md:grid-cols-2');
    expect(source).toContain('lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]');
    expect(source).toContain('stage-rail-scroll');
  });

  it('uses theme-safe accents instead of dark-only emerald/amber fills', async () => {
    const source = await readSource('src/components/StageStepCard.jsx');
    expect(source).toContain('border-l-emerald-500/70');
    expect(source).toContain('border-l-amber-500/80');
    expect(source).toContain('ring-brand-strong');
    expect(source).not.toContain('bg-emerald-950/30');
    expect(source).not.toContain('bg-amber-950/30');
  });

  it('defines the desktop rail scroll fade', async () => {
    const css = await readSource('src/index.css');
    expect(css).toContain('.stage-rail-scroll');
    expect(css).toContain('mask-image');
  });
});
