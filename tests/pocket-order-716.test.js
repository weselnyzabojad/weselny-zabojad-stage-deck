import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TimelineFocusStack from '../src/components/TimelineFocusStack.jsx';

function entry(index, activeAt) {
  return {
    index,
    step: { id: `step_${index}`, title: `Moment ${index}`, type: 'FLEXIBLE' },
    isActive: index === activeAt,
    isDone: index < activeAt,
    projectedStart: `1${index}:00`,
    projectedEnd: `1${index}:15`,
  };
}

const timeline = (length, activeAt) =>
  Array.from({ length }, (_, index) => entry(index, activeAt));

describe('issue #716 pocket focus-stack chronological order', () => {
  it('pins current first and collapses completed/upcoming in compact DOM order', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, {
        compact: true,
        entries: timeline(7, 3),
        activeIndex: 3,
      }),
    );

    const current = html.indexOf('data-focus-zone="current"');
    expect(current).toBeGreaterThan(-1);
    expect(current).toBeLessThan(html.indexOf('role="tablist"'));
    expect(html).not.toContain('data-focus-zone="history"');
    expect(html).not.toContain('data-focus-zone="future"');
  });

  it('keeps the desktop column structure and order attributes unchanged', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, {
        entries: timeline(7, 3),
        activeIndex: 3,
      }),
    );

    expect(html).toContain('lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]');
    expect(html).toContain('order-2 lg:order-1');
    expect(html).toContain('lg:order-2');
    expect(html).toContain('order-3');
  });
});
