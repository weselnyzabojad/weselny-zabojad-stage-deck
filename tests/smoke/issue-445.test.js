import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #445 DJ music policy and set notes i18n', () => {
  it('routes Music Policy chrome through t()', () => {
    const card = read('src/components/MusicPolicyCard.jsx');
    for (const key of [
      'music.title',
      'music.mustPlay.title',
      'music.mustPlay.count',
      'music.mainSongs.title',
      'music.mainSongs.count',
      'music.doNotPlay.title',
      'music.doNotPlay.count',
      'music.mainSongMissing',
      'music.clean.missing',
      'music.clean.on',
      'music.clean.off',
      'music.keySong.tooltip',
      'music.keySong.label',
      'music.keySong.conflict',
      'music.windowRange',
      'music.missing',
    ]) {
      expect(card, key).toContain(key);
    }
    expect(card).not.toContain('🎵 Music policy');
    expect(card).not.toContain('Main songs by step');
    expect(card).not.toContain('Main song not set for this step.');
    expect(card).not.toContain('Guest requests are turned off.');
  });

  it('keeps request status as structured data in the engine', () => {
    const lib = read('src/lib/musicPolicy.js');
    expect(lib).not.toContain("label: 'Requests closed'");
    expect(lib).not.toContain("detail: 'Guest requests are turned off.'");
    expect(lib).not.toContain('label: `Opens');
    expect(lib).toContain("key: 'upcoming'");
    expect(lib).toContain('countdownSec');
  });

  it('localizes the Set notes title and removes the leading glyph', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain("t('dj.setNotes')");
    expect(dj).not.toContain('Set notes');
    expect(dj).not.toContain('🎚');
  });

  it('defines every key in all locales', () => {
    const keys = [
      'music.title',
      'music.mustPlay.title',
      'music.mustPlay.count',
      'music.mainSongs.title',
      'music.mainSongs.count',
      'music.doNotPlay.title',
      'music.doNotPlay.count',
      'music.mainSongMissing',
      'music.clean.missing',
      'music.clean.on',
      'music.clean.off',
      'music.keySong.tooltip',
      'music.keySong.label',
      'music.keySong.conflict',
      'music.status.disabled',
      'music.status.open',
      'music.status.upcoming',
      'music.status.closed',
      'music.status.openUntil',
      'music.status.window',
      'music.detail.disabled',
      'music.detail.noWindow',
      'music.detail.ended',
      'music.detail.window',
      'music.detail.in',
      'music.detail.left',
      'music.windowRange',
      'music.missing',
      'dj.setNotes',
    ];
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of keys) {
        expect(dict, `${locale}:${key}`).toContain(`'${key}'`);
      }
    }
  });
});
