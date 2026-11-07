import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { buildFocusStack } from '../src/lib/focusStack.js';
import { setLocale } from '../src/i18n/index.js';
import TimelineFocusStack from '../src/components/TimelineFocusStack.jsx';

afterEach(() => {
  setLocale('en', { persist: false });
});

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

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

function futureMarkup(html) {
  const start = html.indexOf('data-focus-zone="future"');
  return start < 0 ? '' : html.slice(start);
}

describe('upcoming future stack (#181)', () => {
  it('selects only the immediate next and second-next planned steps', () => {
    const stack = buildFocusStack(timeline(7, 3), 3);

    expect(stack.future.map((item) => item.step.title)).toEqual(['Moment E', 'Moment F']);
    expect(stack.hidden.future).toBe(1);
  });

  it('renders the next step prominently and the second-next behind it', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, { entries: timeline(7, 3), activeIndex: 3 }),
    );
    const future = futureMarkup(html);

    expect(future.match(/data-focus-card/g)).toHaveLength(2);

    // The immediate next step is the most visible future card.
    expect(future).toContain('data-focus-depth="1"');
    expect(future).toContain('data-focus-opacity="1"');
    expect(future).toContain('data-focus-scale="1"');
    expect(future).toContain('Moment E');

    // The second-next step fades and scales behind it, mirroring #180.
    expect(future).toContain('data-focus-depth="2"');
    expect(future).toContain('data-focus-opacity="0.65"');
    expect(future).toContain('data-focus-scale="0.95"');
    expect(future).toContain('Moment F');
  });

  it('never renders farther-future planned steps', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, { entries: timeline(7, 3), activeIndex: 3 }),
    );

    expect(html).not.toContain('Moment G');
    // "Moment A" is the only other entry outside the future horizon; guard the
    // assertion above by confirming the future zone itself holds just two.
    expect(futureMarkup(html).match(/data-focus-card/g)).toHaveLength(2);
  });

  it('uses the same future counts and tiers on a compact pocket layout', () => {
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

    for (const html of [wide, compact]) {
      const future = futureMarkup(html);
      expect(future.match(/data-focus-card/g)).toHaveLength(2);
      expect(future).toContain('data-focus-depth="1"');
      expect(future).toContain('data-focus-depth="2"');
      expect(future).toContain('data-focus-opacity="0.65"');
      expect(future).toContain('Moment E');
      expect(future).toContain('Moment F');
      expect(html).not.toContain('Moment G');
    }

    expect(wide).toContain('data-viewport="wide"');
    expect(compact).toContain('data-viewport="compact"');
  });

  it('treats the first planned step as next when no step is active yet', () => {
    const stack = buildFocusStack(timeline(4, null), -1);

    expect(stack.current).toBeNull();
    expect(stack.future.map((item) => item.step.title)).toEqual(['Moment A', 'Moment B']);
    expect(stack.hidden.future).toBe(2);
  });

  it('defines the mirrored overlap and scale behind the next step', () => {
    const css = read('src/index.css');

    expect(css).toContain('[data-focus-zone="future"] [data-focus-depth="2"]');
    expect(css).toContain('margin-top: -1rem');
    expect(css).toContain('scale(0.95)');
    expect(css).toContain('transform-origin: 50% 0');
  });
});
