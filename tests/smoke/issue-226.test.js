import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #226 Photographer read-only MC-style timeline', () => {
  const photo = read('src/components/PhotographerView.jsx');

  it('removes the Reel Clock summary and uses the step focus stack', () => {
    expect(photo).not.toContain('<ReelClock');
    expect(photo).not.toContain('Read-only timeline');
    expect(photo.match(/<TimelineFocusStack/g)?.length).toBe(2);
  });

  it('keeps the Photographer view read-only', () => {
    expect(photo).not.toContain('HOLD TO ADVANCE');
    expect(photo).not.toContain('Swap w/ Next');
    expect(photo).not.toContain('handleAdvance');
    expect(photo).not.toContain('handleUndo');
  });

  it('keeps the top-bar clock', () => {
    expect(photo).toContain('<TopBarClock');
  });
});
