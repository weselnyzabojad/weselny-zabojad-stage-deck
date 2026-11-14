import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GameClickerOverlay from '../src/components/GameClickerOverlay.jsx';
import {
  buildGameClickerFromBundle,
  enabledCartridgeGames,
  resolveGameLanguages,
  startGameResult,
} from '../src/lib/games.js';
import { importGameKey } from '../src/lib/gameBundleClient.js';
import {
  clearGameQuestions,
  clearGameQuestionsForWedding,
  loadGameQuestions,
  saveGameQuestions,
} from '../src/lib/gameQuestionCache.js';
import {
  bytesToBase64Url,
} from '../supabase/functions/_shared/bundleCrypto.js';
import {
  deriveGameKeyBytes,
  encryptGameBundle,
} from '../supabase/functions/_shared/gameBundle.js';
import { isGameActive } from '../supabase/functions/_shared/gameQuestions.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const masterKey = 'local-32-byte-random-value-000000';
const weddingId = '2026-08-20_test';

const wedding = {
  extensions: { languages: { supported: ['FR', 'PL', 'EN'] } },
  coupleProfile: {
    bride: { firstName: 'Jennifer' },
    groom: { firstName: 'Guillaume' },
  },
  steps: [
    { id: 's1', game: { id: 'test_wiedzy', title: 'Test Wiedzy', gameType: 'TEST_WIEDZY', enabled: true } },
    { id: 's2', game: { id: 'test_zgodnosci', title: 'Test Zgodności', gameType: 'TEST_ZGODNOSCI', enabled: false } },
  ],
};

const questions = [
  {
    id: 'w2',
    prompt: { FR: 'Difficile ?', PL: 'Trudne?', EN: 'Hard?' },
    level: 'HARD',
    answer: 'BRIDE',
  },
  {
    id: 'w1',
    prompt: { FR: 'Facile ?', PL: 'Łatwe?', EN: 'Easy?' },
    level: 'EASY',
    answer: 'GROOM',
  },
];

function memoryStorage() {
  const data = new Map();
  return {
    get length() {
      return data.size;
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

describe('issue #934 MC multilingual game clicker and offline preload', () => {
  it('resolves only cartridge-enabled games and the ordered language list', () => {
    expect(resolveGameLanguages(wedding)).toEqual(['FR', 'PL', 'EN']);
    expect(enabledCartridgeGames(wedding)).toEqual([
      { gameType: 'TEST_WIEDZY', gameId: 'test_wiedzy', title: 'Test Wiedzy' },
    ]);
    const both = {
      ...wedding,
      steps: wedding.steps.map((step) => ({
        ...step,
        game: { ...step.game, enabled: true },
      })),
    };
    expect(enabledCartridgeGames(both).map((game) => game.gameType)).toEqual([
      'TEST_WIEDZY',
      'TEST_ZGODNOSCI',
    ]);
    expect(enabledCartridgeGames({ steps: [{ game: { id: 'test_zgodnosci', title: 'Test Zgodności' } }] })).toEqual([
      { gameType: 'TEST_ZGODNOSCI', gameId: 'test_zgodnosci', title: 'Test Zgodności' },
    ]);
  });

  it('decrypts the same bundle the server encrypted', async () => {
    const entry = await encryptGameBundle({
      masterKey,
      weddingId,
      gameType: 'TEST_WIEDZY',
      revision: 4,
      questions,
    });
    const bytes = await deriveGameKeyBytes({ masterKey, weddingId, gameType: 'TEST_WIEDZY' });
    const key = await importGameKey(bytesToBase64Url(bytes));
    const { decryptGameQuestions } = await import('../src/lib/gameBundleClient.js');
    await expect(
      decryptGameQuestions({
        entry,
        key,
        weddingId,
        gameType: 'TEST_WIEDZY',
        revision: 4,
      }),
    ).resolves.toEqual(questions);
    await expect(
      decryptGameQuestions({
        entry,
        key,
        weddingId,
        gameType: 'TEST_WIEDZY',
        revision: 5,
      }),
    ).rejects.toBeTruthy();
  });

  it('renders every supported language in order with ISO labels', () => {
    const game = buildGameClickerFromBundle({
      game: { gameType: 'TEST_WIEDZY', gameId: 'test_wiedzy', title: 'Test Wiedzy', questions },
      wedding,
      languages: resolveGameLanguages(wedding),
    });
    expect(game.items.map((item) => item.id)).toEqual(['w2', 'w1']);
    expect(game.items[1].prompts).toEqual([
      { language: 'FR', text: 'Facile ?' },
      { language: 'PL', text: 'Łatwe?' },
      { language: 'EN', text: 'Easy?' },
    ]);
    expect(game.items[1].answer).toBe('Guillaume');

    const html = renderToStaticMarkup(
      createElement(GameClickerOverlay, { open: true, game, onClose: () => {} }),
    );
    expect(html).toContain('Facile ?');
    expect(html).toContain('Łatwe?');
    expect(html).toContain('Easy?');
    expect(html.indexOf('>FR<')).toBeLessThan(html.indexOf('>PL<'));
    expect(html.indexOf('>PL<')).toBeLessThan(html.indexOf('>EN<'));
    expect(html).not.toContain('aria-pressed');
  });

  it('shows the safe unavailable state without a clicker', () => {
    const game = buildGameClickerFromBundle({
      game: { gameType: 'TEST_ZGODNOSCI', status: 'unavailable', questions: [] },
      wedding,
    });
    expect(game.unavailable).toBe(true);
    expect(game.items).toEqual([]);
    const html = renderToStaticMarkup(
      createElement(GameClickerOverlay, { open: true, game, onClose: () => {} }),
    );
    expect(html).toContain('Question list could not be loaded');
    expect(html).not.toContain('Reveal answer');
    expect(html).not.toContain('✓ Match');
    expect(html).not.toContain('✕ No match');
  });

  it('keeps decrypted questions in an expiring wedding + game scoped cache', () => {
    const storage = memoryStorage();
    saveGameQuestions(
      {
        weddingId,
        gameType: 'TEST_WIEDZY',
        gameId: 'test_wiedzy',
        title: 'Test Wiedzy',
        revision: 3,
        questions,
        expiresAt: '2030-08-21T00:00:00.000Z',
      },
      storage,
    );
    expect(loadGameQuestions(weddingId, 'TEST_WIEDZY', { storage })).toMatchObject({
      revision: 3,
      questions,
    });
    expect(loadGameQuestions(weddingId, 'TEST_ZGODNOSCI', { storage })).toBeNull();
    expect(
      loadGameQuestions(weddingId, 'TEST_WIEDZY', {
        storage,
        now: Date.parse('2030-08-21T00:00:01.000Z'),
      }),
    ).toBeNull();

    saveGameQuestions({ weddingId, gameType: 'TEST_WIEDZY', questions }, storage);
    saveGameQuestions({ weddingId, gameType: 'TEST_ZGODNOSCI', questions }, storage);
    expect(clearGameQuestions(weddingId, 'TEST_WIEDZY', storage)).toBe(true);
    expect(loadGameQuestions(weddingId, 'TEST_WIEDZY', { storage })).toBeNull();
    expect(clearGameQuestionsForWedding(weddingId, storage)).toBe(1);
    expect(loadGameQuestions(weddingId, 'TEST_ZGODNOSCI', { storage })).toBeNull();
  });

  it('marks the existing game_results session active until it completes', () => {
    const game = buildGameClickerFromBundle({
      game: { gameType: 'TEST_ZGODNOSCI', gameId: 'test_zgodnosci', title: 'Test Zgodności', questions: [] },
      wedding,
    });
    const started = startGameResult({
      game: { ...game, id: 'test_zgodnosci', items: [{ id: 'z1' }] },
      startedAt: '2026-08-20T22:00:00.000Z',
    });
    expect(started).toMatchObject({
      gameId: 'test_zgodnosci',
      startedAt: '2026-08-20T22:00:00.000Z',
      completedAt: null,
      questions: {},
    });
    const liveState = { game_results: { test_zgodnosci: started } };
    expect(isGameActive(liveState, { gameId: 'test_zgodnosci', gameType: 'TEST_ZGODNOSCI' })).toBe(true);
    expect(
      isGameActive(
        { game_results: { test_zgodnosci: { ...started, completedAt: '2026-08-20T22:30:00.000Z' } } },
        { gameId: 'test_zgodnosci', gameType: 'TEST_ZGODNOSCI' },
      ),
    ).toBe(false);
  });

  it('loads bundles only for the authenticated MC and clears on logout', () => {
    const stage = read('src/StageDeck.jsx');
    expect(stage).toContain('useGameBundles(');
    expect(stage).toContain("roleSession?.role === 'mc' || roleSession?.role === 'dj_mc'");
    expect(stage).toContain('isProduction && mcGameRole');
    for (const file of [
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/VenueManagerView.jsx',
      'src/components/SpeakerView.jsx',
    ]) {
      expect(read(file), file).not.toContain('useGameBundles');
      expect(read(file), file).not.toContain('gameQuestionCache');
    }
    expect(read('src/App.jsx')).toContain('clearGameQuestionsForWedding');
    expect(read('src/hooks/useGameBundles.js')).toContain('clearGameQuestionsForWedding');
    expect(read('src/hooks/useGameBundles.js')).toContain("error?.status === 401");
    expect(read('src/lib/gameBundleClient.js')).not.toContain('console.');
  });
});
