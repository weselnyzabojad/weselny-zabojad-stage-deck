import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import KeySongsCard from '../../src/components/KeySongsCard.jsx';
import GamesCueCard from '../../src/components/GamesCueCard.jsx';
import OczepinyCueCard from '../../src/components/OczepinyCueCard.jsx';
import { setLocale } from '../../src/i18n/index.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

afterEach(() => setLocale('en', { persist: false }));

describe('issue #535 role-view i18n and cartridge data boundary', () => {
  it('localizes key-song chrome without translating song data', () => {
    setLocale('pl', { persist: false });
    const html = renderToStaticMarkup(
      createElement(KeySongsCard, {
        tier: 'standard',
        songs: [
          {
            id: 'first_dance',
            moment: 'FIRST_DANCE',
            title: 'Zażółć gęślą jaźń',
            artist: 'Łukasz',
          },
        ],
      }),
    );
    expect(html).toContain('Kluczowe utwory');
    expect(html).toContain('Zażółć gęślą jaźń');
    expect(html).toContain('Łukasz');
    expect(html).not.toContain('Key songs');
  });

  it('localizes Oczepiny labels without retired authored notes', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(
      createElement(OczepinyCueCard, {
        wedding: {
          oczepiny: {
            enabled: true,
            variant: 'MIDNIGHT',
            throwings: { veil: true, bouquet: false, bowTie: true, cravat: false },
            game: { enabled: true },
            countdown: { mode: 'MC' },
          },
        },
      }),
    );
    expect(html).toContain('Lancers');
    expect(html).toContain('Voile');
    expect(html).toContain('Jeu activé');
    expect(html).toContain('Compte à rebours MC');
    expect(html).not.toContain('MC countdown');
  });

  it('keeps game titles and question prompts as cartridge data', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(
      createElement(GamesCueCard, {
        role: 'mc',
        gameId: 'test_wiedzy',
        wedding: {
          games: {
            enabled: true,
            questionLists: [
              {
                id: 'test_wiedzy',
                title: 'Test Wiedzy',
                gameType: 'TEST_WIEDZY',
                status: 'AVAILABLE',
                questions: [{ id: 'w01', prompt: 'Kto to powiedział?' }],
              },
            ],
          },
        },
      }),
    );
    expect(html).toContain('Test Wiedzy');
    expect(html).toContain('Kto to powiedział?');
  });

  it('routes key-song UI actions through t() and never wraps cartridge values', () => {
    const card = read('src/components/KeySongsCard.jsx');
    for (const key of [
      'keySongs.openFile',
      'keySongs.locateFile',
      'keySongs.copyLink',
      'keySongs.protectedFile',
      'keySongs.qrUnavailable',
    ]) {
      expect(card).toContain(key);
    }
    for (const forbidden of ['t(song.title', 't(song.artist', 't(source.notes', 't(song.note']) {
      expect(card).not.toContain(forbidden);
    }
  });

  it('localizes the DJ export pack labels', () => {
    const pack = read('src/components/DjExportPack.jsx');
    for (const key of ['exportPack.title', 'exportPack.print', 'exportPack.noBackup']) {
      expect(pack).toContain(key);
    }
  });
});
