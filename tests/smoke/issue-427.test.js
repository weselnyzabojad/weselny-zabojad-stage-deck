import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildFocusStack } from '../../src/lib/focusStack.js';
import TimelineFocusStack from '../../src/components/TimelineFocusStack.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

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

describe('issue #427 show full timeline expander', () => {
  it('renders an expander for hidden history and future entries', () => {
    const html = renderToStaticMarkup(
      createElement(TimelineFocusStack, { entries: timeline(7, 3), activeIndex: 3 }),
    );

    expect(html).toContain('data-focus-expander="history"');
    expect(html).toContain('data-focus-expander="future"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Show 1 more');
  });

  it('supports both compact and wide layouts', () => {
    for (const compact of [true, false]) {
      const html = renderToStaticMarkup(
        createElement(TimelineFocusStack, {
          entries: timeline(7, 3),
          activeIndex: 3,
          compact,
        }),
      );
      expect(html).toContain(`data-viewport="${compact ? 'compact' : 'wide'}"`);
      expect(html).toContain('data-focus-expander="history"');
      expect(html).toContain('data-focus-expander="future"');
    }
  });

  it('can reveal the full zone without changing the default stack', () => {
    const limited = buildFocusStack(timeline(7, 3), 3);
    const full = buildFocusStack(timeline(7, 3), 3, {
      historyLimit: 7,
      futureLimit: 7,
    });

    expect(limited.hidden).toEqual({ history: 1, future: 1 });
    expect(full.hidden).toEqual({ history: 0, future: 0 });
    expect(full.history).toHaveLength(3);
    expect(full.future).toHaveLength(3);
  });

  it('is keyboard accessible and translated', () => {
    const source = read('src/components/TimelineFocusStack.jsx');
    expect(source).toContain('type="button"');
    expect(source).toContain('aria-expanded={expanded}');
    expect(source).toContain('onClick={onToggleExpanded}');

    const en = read('src/i18n/en.js');
    expect(en).toContain("'mc.rail.showMore'");
    expect(en).toContain("'mc.rail.showLess'");
    for (const locale of ['fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      expect(dict).toContain("'mc.rail.showMore'");
      expect(dict).toContain("'mc.rail.showLess'");
    }
  });
});
