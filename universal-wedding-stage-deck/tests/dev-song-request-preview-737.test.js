import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SongRequestApp from '../src/components/SongRequestApp.jsx';
import { DEV_VIEW_ROLES } from '../src/lib/viewRoles.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #737 dev song request preview', () => {
  it('adds the dev view role and switcher label', () => {
    expect(DEV_VIEW_ROLES).toContain('song_request');
    expect(read('src/components/DevViewSwitcher.jsx')).toContain("song_request: 'Song request'");
  });

  it('renders the real guest UI with submissions disabled in preview', () => {
    const html = renderToStaticMarkup(
      createElement(SongRequestApp, { roomCode: 'abc123', preview: true }),
    );
    expect(html).toContain('Preview only');
    expect(html).toContain('disabled');
  });

  it('gates the preview behind the build-time DEV flag', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain("import.meta.env.DEV && currentRole === 'song_request'");
    expect(deck).toContain('DevSongRequestPreview');
  });
});
