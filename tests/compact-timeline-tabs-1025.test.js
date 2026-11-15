import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1025 compact timeline tabs', () => {
  it('renders the current card first in the compact branch', () => {
    const stack = read('src/components/TimelineFocusStack.jsx');
    const compact = stack.slice(
      stack.indexOf('data-viewport="compact"'),
      stack.indexOf('\n  return (', stack.indexOf('data-viewport="compact"')),
    );
    expect(compact.indexOf('data-focus-zone="current"')).toBeLessThan(compact.indexOf('role="tablist"'));
    expect(compact).toContain('order-1');
    expect(compact).toContain('order-2');
  });

  it('collapses completed/upcoming behind two accessible tabs by default', () => {
    const stack = read('src/components/TimelineFocusStack.jsx');
    expect(stack).toContain('const [compactTab, setCompactTab] = useState(null)');
    expect(stack).toContain('role="tablist"');
    expect(stack).toContain('role="tab"');
    expect(stack).toContain('aria-selected={selected}');
    expect(stack).toContain('setCompactTab(selected ? null : zone)');
    expect(stack).toContain('role="tabpanel"');
    expect(stack.match(/compactTab === 'history'/g)).toHaveLength(1);
    expect(stack.match(/compactTab === 'future'/g)).toHaveLength(1);
  });

  it('shows counts and keeps the current card outside the tabs', () => {
    const stack = read('src/components/TimelineFocusStack.jsx');
    expect(stack).toContain("`${copy.done} (${stack.history.length + stack.hidden.history})`");
    expect(stack).toContain("`${copy.upcoming} (${stack.future.length + stack.hidden.future})`");
    const compact = stack.slice(
      stack.indexOf('data-viewport="compact"'),
      stack.indexOf('\n  return (', stack.indexOf('data-viewport="compact"')),
    );
    const tabPanel = compact.indexOf('compactTab === \'history\'');
    expect(compact.indexOf('data-focus-zone="current"')).toBeLessThan(tabPanel);
  });

  it('leaves the desktop three-column layout unchanged', () => {
    const stack = read('src/components/TimelineFocusStack.jsx');
    expect(stack).toContain('md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]');
    expect(stack).toContain('data-viewport={compact ?');
  });
});
