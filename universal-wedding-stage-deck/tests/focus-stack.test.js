import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FOCUS_STACK_LIMITS,
  buildFocusStack,
  focusStackTier,
} from '../src/lib/focusStack.js';
import { setLocale } from '../src/i18n/index.js';
import TimelineFocusStack from '../src/components/TimelineFocusStack.jsx';

afterEach(() => {
  setLocale('en', { persist: false });
});

const TITLES = ['Moment A', 'Moment B', 'Moment C', 'Moment D', 'Moment E', 'Moment F', 'Moment G'];

function entry(index, overrides = {}) {
  return {
    index,
    step: {
      id: `step_${index}`,
      title: TITLES[index] ?? `Moment ${index}`,
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
      isDone: activeAt != null && index < activeAt,
    }),
  );
}

describe('buildFocusStack', () => {
  it('uses the shared two-history / two-future visibility limits', () => {
    expect(FOCUS_STACK_LIMITS).toEqual({ history: 2, future: 2 });
  });

  it('selects the current step, the last two completed steps and the next two steps', () => {
    const stack = buildFocusStack(timeline(7, 3), 3);

    expect(stack.current?.step.title).toBe('Moment D');
    expect(stack.history.map((item) => item.step.title)).toEqual(['Moment C', 'Moment B']);
    expect(stack.future.map((item) => item.step.title)).toEqual(['Moment E', 'Moment F']);
    expect(stack.counts).toEqual({ current: 1, history: 2, future: 2 });
    expect(stack.hidden).toEqual({ history: 1, future: 1 });
  });

  it('keeps history and future nearest-first', () => {
    const stack = buildFocusStack(timeline(5, 2), 2);

    expect(stack.history[0].step.title).toBe('Moment B');
    expect(stack.history[1].step.title).toBe('Moment A');
    expect(stack.future[0].step.title).toBe('Moment D');
    expect(stack.future[1].step.title).toBe('Moment E');
  });

  it('falls back to the completed tail when the event is over', () => {
    const entries = timeline(4, null).map((item) => ({ ...item, isDone: true }));
    const stack = buildFocusStack(entries, -1);

    expect(stack.current).toBeNull();
    expect(stack.history.map((item) => item.step.title)).toEqual(['Moment D', 'Moment C']);
    expect(stack.future).toEqual([]);
    expect(stack.hidden.history).toBe(2);
  });

  it('accepts explicit limits for tests and future expand controls', () => {
    const stack = buildFocusStack(timeline(7, 3), 3, { historyLimit: 1, futureLimit: 0 });

    expect(stack.history).toHaveLength(1);
    expect(stack.future).toHaveLength(0);
    expect(stack.hidden).toEqual({ history: 2, future: 3 });
  });
});

describe('focusStackTier', () => {
  it('keeps the current card at depth 0 and the neighbours behind it', () => {
    expect(focusStackTier('current')).toMatchObject({ depth: 0, opacity: 1, scale: 1 });
    expect(focusStackTier('history', 0)).toMatchObject({ depth: 1, opacity: 1 });
    expect(focusStackTier('history', 1)).toMatchObject({ depth: 2, scale: 0.95 });
    expect(focusStackTier('future', 0)).toMatchObject({ depth: 1, opacity: 1 });
    expect(focusStackTier('future', 1)).toMatchObject({ depth: 2, scale: 0.95 });
    expect(focusStackTier('history', 2)).toBeNull();
  });
});

describe('TimelineFocusStack rendering', () => {
  it('renders only one current, two history and two future cards', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, { entries: timeline(7, 3), activeIndex: 3 }),
    );

    expect(html.match(/data-focus-card/g)).toHaveLength(5);
    expect(html).toContain('data-focus-zone="history"');
    expect(html).toContain('data-focus-zone="current"');
    expect(html).toContain('data-focus-zone="future"');
  });

  it('removes older history and farther future from the DOM and reading order', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, { entries: timeline(7, 3), activeIndex: 3 }),
    );

    // Visible: B, C (history), D (current), E, F (future).
    expect(html).toContain('Moment B');
    expect(html).toContain('Moment C');
    expect(html).toContain('Moment D');
    expect(html).toContain('Moment E');
    expect(html).toContain('Moment F');

    // Hidden: A (third-oldest) and G (third-next) are not merely dimmed.
    expect(html).not.toContain('Moment A');
    expect(html).not.toContain('Moment G');
  });

  it('applies the shared depth tiers to every rendered card', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, { entries: timeline(7, 3), activeIndex: 3 }),
    );

    expect(html).toContain('data-focus-depth="1"');
    expect(html).toContain('data-focus-depth="2"');
    expect(html).toContain('data-focus-scale="0.95"');
    expect(html).toContain('data-focus-opacity="0.65"');
  });

  it('enforces the same counts in wide and compact viewports', () => {
    const wide = renderToStaticMarkup(
      createElement(TimelineFocusStack, { entries: timeline(7, 3), activeIndex: 3 }),
    );
    const compact = renderToStaticMarkup(
      createElement(TimelineFocusStack, {
        entries: timeline(7, 3),
        activeIndex: 3,
        compact: true,
      }),
    );

    expect(wide.match(/data-focus-card/g)).toHaveLength(5);
    expect(compact.match(/data-focus-card/g)).toHaveLength(5);
    expect(wide).toContain('data-viewport="wide"');
    expect(compact).toContain('data-viewport="compact"');
  });
});

describe('universal role wiring', () => {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

  it('uses the shared focus stack in every role timeline surface', () => {
    for (const path of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
    ]) {
      const source = read(path);
      expect(source, path).toContain('TimelineFocusStack');
      expect(source, path).toContain('entries=');
      expect(source, path).toContain('activeIndex');
    }
  });

  it('keeps the compact role surfaces wired to the same component', () => {
    for (const path of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
    ]) {
      expect(read(path), path).toContain('compact');
    }
  });
});
