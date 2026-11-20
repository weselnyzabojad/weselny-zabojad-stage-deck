import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEV_VIEW_ROLES } from '../src/lib/viewRoles.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #737 dev song request preview', () => {
  it('adds the dev view role and switcher label', () => {
    expect(DEV_VIEW_ROLES).toContain('song_request');
    expect(read('src/components/DevViewSwitcher.jsx')).toContain("song_request: 'Song request'");
  });

  it('disables submissions in preview mode', () => {
    const app = read('src/components/SongRequestApp.jsx');
    expect(app).toContain('preview = false');
    expect(app).toContain('if (preview || sending');
    expect(app).toContain('songRequest.previewOnly');
    expect(app).toContain('disabled={preview || sending || offline}');
  });

  it('gates the preview behind the build-time DEV flag', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain("import.meta.env.DEV && currentRole === 'song_request'");
    expect(deck).toContain('DevSongRequestPreview');
  });
});
