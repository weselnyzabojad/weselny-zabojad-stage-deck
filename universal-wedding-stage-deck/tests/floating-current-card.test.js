import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '../src/i18n/index.js';
import TimelineFocusStack from '../src/components/TimelineFocusStack.jsx';
import StageStepCard from '../src/components/StageStepCard.jsx';

afterEach(() => {
  setLocale('en', { persist: false });
});

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function entry(index, overrides = {}) {
  return {
    index,
    step: {
      id: `step_${index}`,
      title: `Moment ${index}`,
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

describe('floating current card (#179)', () => {
  it('renders exactly one floating current card on a desktop focus stack', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, { entries: timeline(5, 2), activeIndex: 2 }),
    );

    expect(html.match(/timeline-focus-current/g)).toHaveLength(1);
    expect(html).toContain('data-viewport="wide"');
    expect(html).toContain('data-focus-depth="0"');
  });

  it('keeps the same focal treatment on a compact pocket stack', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, {
        entries: timeline(5, 2),
        activeIndex: 2,
        compact: true,
      }),
    );

    expect(html.match(/timeline-focus-current/g)).toHaveLength(1);
    expect(html).toContain('data-viewport="compact"');
  });

  it('only applies the floating class to the current variant', () => {
    const current = renderToStaticMarkup(
      createElement(StageStepCard, { entry: entry(2), variant: 'current' }),
    );
    const done = renderToStaticMarkup(
      createElement(StageStepCard, { entry: entry(1), variant: 'done' }),
    );
    const next = renderToStaticMarkup(
      createElement(StageStepCard, { entry: entry(3), variant: 'next' }),
    );

    expect(current).toContain('timeline-focus-current');
    expect(current).toContain('border-brand-strong');
    expect(current).toContain('ring-brand-strong');
    expect(done).not.toContain('timeline-focus-current');
    expect(next).not.toContain('timeline-focus-current');
  });

  it('defines layered depth, a static tilt and a reduced-motion fallback', () => {
    const css = read('src/index.css');

    expect(css).toContain('.timeline-focus-current');
    expect(css).toContain('perspective(1200px)');
    expect(css).toContain('rotateX(1.2deg)');
    expect(css).toContain('--focus-shadow');
    expect(css).toContain('box-shadow');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('transform: none');
  });

  it('uses the shared floating treatment in every role timeline surface', () => {
    for (const path of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
    ]) {
      expect(read(path), path).toContain('TimelineFocusStack');
    }
  });
});
