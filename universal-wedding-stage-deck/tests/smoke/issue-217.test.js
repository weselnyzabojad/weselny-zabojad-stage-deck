import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #217 DJ section cleanup and scrolling', () => {
  const dj = read('src/components/DjBoothView.jsx');
  const stack = read('src/components/TimelineFocusStack.jsx');

  it('keeps only the approved sections', () => {
    for (const kept of ['TimelineFocusStack', 'MusicPolicyCard', 'Set notes']) {
      expect(dj).toContain(kept);
    }
    for (const removed of [
      'KeySongsCard',
      'CutoffStopwatchCard',
      'DjSetHealthCard',
      'DjExportPack',
      'DjNowPlayingOverlay',
      'StagePingBanner',
      'VIP booth cues',
      'Fullscreen',
      'Copy set list',
    ]) {
      expect(dj).not.toContain(removed);
    }
  });

  it('uses a single page scroll with a stable header', () => {
    expect(dj).toContain('flex min-h-screen flex-col');
    expect(dj).not.toContain('flex h-screen');
    expect(dj).not.toContain('overflow-hidden');
    expect(dj).toContain('sticky top-0 z-30');
    expect(dj).not.toContain('overflow-y-auto');
  });

  it('disables nested focus-stack scrolling for DJ', () => {
    expect(dj.match(/zoneScroll=\{false\}/g)?.length).toBe(2);
    expect(stack).toContain('zoneScroll = true');
    expect(stack).toContain("compact || !zoneScroll ? '' : 'stage-rail-scroll '");
  });
});
