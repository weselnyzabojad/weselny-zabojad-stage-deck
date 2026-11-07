import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { buildFocusStack } from '../src/lib/focusStack.js';
import { setLocale } from '../src/i18n/index.js';
import TimelineFocusStack from '../src/components/TimelineFocusStack.jsx';
import StageStepCard from '../src/components/StageStepCard.jsx';

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

function historyMarkup(html) {
  const start = html.indexOf('data-focus-zone="history"');
  const end = html.indexOf('data-focus-zone="current"');
  return html.slice(start, end);
}

describe('completed history stack (#180)', () => {
  it('selects only the last and second-to-last completed steps', () => {
    const stack = buildFocusStack(timeline(7, 3), 3);

    expect(stack.history.map((item) => item.step.title)).toEqual(['Moment C', 'Moment B']);
    expect(stack.hidden.history).toBe(1);
  });

  it('renders the last completed card fully and the second-to-last behind it', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, { entries: timeline(7, 3), activeIndex: 3 }),
    );
    const history = historyMarkup(html);

    expect(history.match(/data-focus-card/g)).toHaveLength(2);
    expect(history).toContain('data-focus-depth="1"');
    expect(history).toContain('data-focus-opacity="1"');
    expect(history).toContain('data-focus-depth="2"');
    expect(history).toContain('data-focus-opacity="0.65"');
    expect(history).toContain('data-focus-scale="0.95"');
    expect(history).toContain('Moment C');
    expect(history).toContain('Moment B');
  });

  it('never renders older completed steps', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, { entries: timeline(7, 3), activeIndex: 3 }),
    );

    expect(html).not.toContain('Moment A');
  });

  it('keeps the same two-history depth stack on a compact pocket layout', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, {
        entries: timeline(7, 3),
        activeIndex: 3,
        compact: true,
      }),
    );
    const history = historyMarkup(html);

    expect(history.match(/data-focus-card/g)).toHaveLength(2);
    expect(history).toContain('data-focus-depth="2"');
    expect(history).toContain('data-focus-opacity="0.65"');
    expect(html).toContain('data-viewport="compact"');
  });

  it('defines the overlap and scale behind the last completed card', () => {
    const css = read('src/index.css');

    expect(css).toContain('[data-focus-zone="history"] [data-focus-depth="2"]');
    expect(css).toContain('margin-top: -1rem');
    expect(css).toContain('scale(0.95)');
    expect(css).toContain('transform-origin: 50% 0');
  });

  it('keeps the last completed card fully opaque', () => {
    const html = renderToStaticMarkup(
      createElement(StageStepCard, {
        entry: entry(2, { isDone: true }),
        variant: 'done',
      }),
    );

    expect(html).not.toContain('opacity-90');
    expect(html).toContain('bg-card');
  });
});
