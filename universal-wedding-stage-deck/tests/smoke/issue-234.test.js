import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #234 remove DJ Reel Clock', () => {
  const dj = read('src/components/DjBoothView.jsx');

  it('removes the Reel Clock card from both DJ tiers and viewports', () => {
    expect(dj).not.toContain('<ReelClock');
    expect(dj).not.toContain("import ReelClock");
  });

  it('keeps the top-bar clock and timeline', () => {
    expect(dj).toContain('<TopBarClock');
    expect(dj).toContain('<TimelineFocusStack');
  });

  it('keeps Reel Clock available to other roles', () => {
    expect(read('src/components/PhotographerView.jsx')).toContain('<ReelClock');
  });
});
