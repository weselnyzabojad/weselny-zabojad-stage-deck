import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1148 compact Musician step toggles', () => {
  it('passes the viewport compact flag into the shared focus stack', () => {
    const view = read('src/components/MusicianView.jsx');
    expect(view).toContain('<TimelineFocusStack');
    expect(view).toContain('compact={compact}');
    expect(view).toContain('currentFooter={<ActiveVendorsBar');
  });

  it('uses the existing shared compact tablist instead of duplicating markup', () => {
    const stack = read('src/components/TimelineFocusStack.jsx');
    expect(stack).toContain('data-testid="timeline-focus-stack"');
    expect(stack).toContain('role="tablist"');
    expect(stack).toContain('copy.done');
    expect(stack).toContain('copy.upcoming');
    expect(stack).toContain('setCompactTab');
    expect(stack).toContain('{currentFooter ? <div className="mt-2 min-w-0">{currentFooter}</div> : null}');
  });

  it('keeps the desktop branch and other compact views unchanged', () => {
    const view = read('src/components/MusicianView.jsx');
    expect(view).not.toContain('StepToggleButtons');
    const tabTest = read('tests/compact-timeline-tabs-1025.test.js');
    expect(tabTest).toContain('data-viewport="compact"');
  });
});
