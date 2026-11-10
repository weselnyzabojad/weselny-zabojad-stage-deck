import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DjNowPlayingOverlay from '../../src/components/DjNowPlayingOverlay.jsx';
import { resolveNowPlaying } from '../../src/lib/nowPlaying.js';

const activeEntry = {
  step: {
    id: 'step_03',
    title: 'Grand entrance',
    dj: { track: 'Marry You', cutoff: '18:05' },
  },
  projectedStart: '18:00',
};

const nextEntry = {
  step: { id: 'step_04', title: 'Dinner', dj: { track: 'Fly Me to the Moon' } },
  projectedStart: '18:25',
};

const keySongs = [
  {
    id: 'grand_entrance',
    stepId: 'step_03',
    title: 'Marry You',
    artist: 'Bruno Mars',
    plannedTime: '18:00',
  },
];

describe('issue #146 VIP fullscreen now playing', () => {
  it('resolves active and next cues', () => {
    const view = resolveNowPlaying({ activeEntry, nextEntry, keySongs });
    expect(view.title).toBe('Marry You');
    expect(view.artist).toBe('Bruno Mars');
    expect(view).not.toHaveProperty('cues');
    expect(view.cutoff).toBe('18:05');
    expect(view.nextTitle).toBe('Fly Me to the Moon');
    expect(view.nextStart).toBe('18:25');
  });

  it('falls back to the planned track when no key song is linked', () => {
    const view = resolveNowPlaying({ activeEntry, nextEntry });
    expect(view.title).toBe('Marry You');
    expect(view).not.toHaveProperty('cues');
  });

  it('does not render when VIP is not enabled', () => {
    const html = renderToStaticMarkup(
      createElement(DjNowPlayingOverlay, {
        enabled: false,
        open: true,
        activeEntry,
        nextEntry,
        keySongs,
      }),
    );
    expect(html).toBe('');
  });

  it('renders large active/next content when open', () => {
    const html = renderToStaticMarkup(
      createElement(DjNowPlayingOverlay, {
        enabled: true,
        open: true,
        activeEntry,
        nextEntry,
        keySongs,
      }),
    );
    expect(html).toContain('VIP fullscreen now playing');
    expect(html).toContain('Marry You');
    expect(html).toContain('Bruno Mars');
    expect(html).not.toContain('Start 0:05');
    expect(html).not.toContain('Fade 3:35');
    expect(html).toContain('18:05');
    expect(html).toContain('Fly Me to the Moon');
    expect(html).toContain('Close');
  });
});
