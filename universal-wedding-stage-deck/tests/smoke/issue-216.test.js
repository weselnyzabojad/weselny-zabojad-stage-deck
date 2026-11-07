import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #216 DJ timeline alignment with MC', () => {
  const dj = read('src/components/DjBoothView.jsx');

  it('uses the shared focus stack as the timeline presentation', () => {
    expect(dj).toContain('<TimelineFocusStack');
    expect(dj).toContain('entries={timeline}');
    expect(dj).toContain('activeIndex={activeIndex}');
    expect(dj).toContain('currentBody={djCurrentBody}');
    expect(dj).not.toContain('📋 Projected timeline');
  });

  it('keeps the DJ view read-only with no MC step controls', () => {
    expect(dj).not.toContain('HOLD TO ADVANCE');
    expect(dj).not.toContain('Swap w/ Next');
    expect(dj).not.toContain('handleAdvance');
    expect(dj).not.toContain('handleUndo');
    expect(dj).not.toContain('MC Cues');
  });

  it('uses the same focus-stack component in desktop and pocket', () => {
    expect(dj.match(/<TimelineFocusStack/g)?.length).toBe(2);
  });
});
