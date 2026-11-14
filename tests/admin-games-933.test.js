import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminGamesPanel from '../src/admin/AdminGamesPanel.jsx';
import {
  gameDocLanguageReview,
  legacyGameMigration,
  resolveAdminGame,
  resolveAdminGames,
  resolveGameAnswer,
} from '../src/admin/adminGames.js';
import { GAME_TYPES } from '../src/lib/gameQuestions.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const wedding = (cartridge) => ({
  wedding_id: 'Test&Wedding-UM-2026-08-001',
  room_code: 'testroom',
  couple: 'Bride & Groom',
  archived_at: null,
  cartridge,
});

const cartridge = (overrides = {}) => ({
  extensions: { languages: { supported: ['PL', 'FR'] } },
  steps: [
    {
      id: 'game_wiedzy',
      title: 'Test Wiedzy',
      game: {
        id: 'test_wiedzy',
        title: 'Test Wiedzy',
        gameType: GAME_TYPES.TEST_WIEDZY,
        enabled: true,
        questions: [{ id: 'w1', prompt: { PL: 'Pytanie', FR: 'Question' } }],
      },
    },
    {
      id: 'game_zgodnosci',
      title: 'Test Zgodności',
      game: {
        id: 'test_zgodnosci',
        title: 'Test Zgodności',
        gameType: GAME_TYPES.TEST_ZGODNOSCI,
        enabled: false,
      },
    },
  ],
  ...overrides,
});

describe('issue #933 admin game panels', () => {
  it('always resolves both games and reads per-step enablement first', () => {
    const games = resolveAdminGames(cartridge());
    expect(games.map((game) => game.gameType)).toEqual([
      GAME_TYPES.TEST_WIEDZY,
      GAME_TYPES.TEST_ZGODNOSCI,
    ]);
    expect(games[0]).toMatchObject({ enabled: true, enablement: 'step' });
    expect(games[1]).toMatchObject({ enabled: false, enablement: 'step' });
  });

  it('falls back to legacy games.enabled and games.questionLists without an admin toggle', () => {
    const legacy = {
      extensions: { languages: { supported: ['PL'] } },
      games: {
        enabled: true,
        questionLists: [
          {
            id: 'test_wiedzy',
            title: 'Test Wiedzy',
            gameType: GAME_TYPES.TEST_WIEDZY,
            enabled: true,
            questions: [{ id: 'w1', prompt: { PL: 'Pytanie' } }],
          },
        ],
      },
      steps: [],
    };
    expect(resolveAdminGame(legacy, GAME_TYPES.TEST_WIEDZY)).toMatchObject({
      enabled: true,
      enablement: 'legacy',
      gameId: 'test_wiedzy',
    });
    expect(resolveAdminGame({ ...legacy, games: { ...legacy.games, enabled: false } }, GAME_TYPES.TEST_WIEDZY).enabled).toBe(false);
    expect(resolveAdminGame(cartridge(), GAME_TYPES.TEST_WIEDZY).enabled).toBe(true);
    const panel = read('src/admin/AdminGamesPanel.jsx');
    expect(panel).not.toContain('setGameEnabled');
    expect(panel).not.toContain('toggle');
  });

  it('flags missing languages for every game', () => {
    const games = resolveAdminGames({ steps: [] });
    expect(games.every((game) => game.languagesMissing)).toBe(true);
    expect(games.every((game) => game.languages.length === 0)).toBe(true);
  });

  it('warns and blocks Doc creation when languages are missing', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminGamesPanel, { wedding: wedding({ steps: [] }), readOnly: false }),
    );
    expect(markup).toContain('Test Wiedzy');
    expect(markup).toContain('Test Zgodności');
    expect(markup).toContain('Content languages missing');
    expect(markup).toContain('disabled');
    expect(read('src/admin/AdminGamesPanel.jsx')).toContain(
      'disabled={disabled || Boolean(busy) || game.languagesMissing}',
    );
  });

  it('renders disabled panels with no create, parse or publish actions', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminGamesPanel, {
        wedding: wedding({
          extensions: { languages: { supported: ['PL'] } },
          steps: [
            {
              id: 'game_wiedzy',
              title: 'Test Wiedzy',
              game: {
                id: 'test_wiedzy',
                title: 'Test Wiedzy',
                gameType: GAME_TYPES.TEST_WIEDZY,
                enabled: false,
              },
            },
          ],
        }),
      }),
    );
    expect(markup).toContain('Disabled by the wedding cartridge');
    expect(markup).not.toContain('Create question Doc');
    expect(markup).not.toContain('Parse Doc');
    expect(markup).not.toContain('Publish');
  });

  it('renders enabled Doc and publish controls for an enabled game', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminGamesPanel, { wedding: wedding(cartridge()) }),
    );
    expect(markup).toContain('Create question Doc');
    expect(markup).toContain('Doc ready');
    expect(markup).toContain('Parse Doc');
    expect(markup).toContain('Publish');
    expect(markup).toContain('Admin logs · 90 days');
  });

  it('detects language changes and forces review plus re-parse', () => {
    const review = gameDocLanguageReview(
      { languages: ['PL'], review_required: false },
      ['PL', 'FR'],
    );
    expect(review).toMatchObject({ required: true, languagesChanged: true, added: ['FR'] });
    expect(
      gameDocLanguageReview({ languages: ['PL'], review_required: true }, ['PL']),
    ).toMatchObject({ required: true, reviewRequired: true, languagesChanged: false });
    expect(gameDocLanguageReview({ languages: ['PL'] }, ['PL'])).toBeNull();
  });

  it('summarizes legacy linked and unlinked migration counts', () => {
    const migration = legacyGameMigration(
      cartridge({
        steps: [
          {
            game: {
              id: 'test_wiedzy',
              title: 'Test Wiedzy',
              gameType: GAME_TYPES.TEST_WIEDZY,
              enabled: true,
              sourceDocId: 'doc_wiedzy',
              questions: [{ id: 'w1' }, { id: 'w2' }],
            },
          },
          {
            game: {
              id: 'test_zgodnosci',
              title: 'Test Zgodności',
              gameType: GAME_TYPES.TEST_ZGODNOSCI,
              enabled: true,
              questions: [{ id: 'z1' }],
            },
          },
        ],
      }),
      [{ game_type: GAME_TYPES.TEST_WIEDZY, drive_doc_id: 'doc_wiedzy' }],
    );
    expect(migration).toMatchObject({
      linkedCount: 1,
      unlinkedCount: 1,
      questionCount: 3,
      unlinkedQuestionCount: 1,
      hasLegacy: true,
    });
    expect(migration.lists.find((list) => list.gameType === GAME_TYPES.TEST_ZGODNOSCI).linked).toBe(false);
  });

  it('resolves the answer key from the couple profile', () => {
    const couple = {
      coupleProfile: { bride: { firstName: 'Anna' }, groom: { firstName: 'Marek' } },
    };
    expect(resolveGameAnswer({ answer: 'BRIDE' }, couple)).toEqual({ name: 'Anna', role: 'BRIDE' });
    expect(resolveGameAnswer({ answer: 'GROOM' }, couple)).toEqual({ name: 'Marek', role: 'GROOM' });
  });

  it('wires every enabled lifecycle action and confirmation', () => {
    const panel = read('src/admin/AdminGamesPanel.jsx');
    for (const call of [
      'createGameQuestionDoc',
      'parseGameQuestionDoc',
      'rewriteGameQuestionDocColumns',
      'publishGameQuestions',
      'restoreGameQuestions',
      'AdminConfirmDialog',
      'window.confirm',
      'Plaintext preview',
      'Answer key',
      'Admin logs · 90 days',
      'RESULTS ACTIVE',
      'Publish and restore are blocked',
      'Legacy game questions detected',
      'will lose their text',
    ]) {
      expect(panel).toContain(call);
    }
    const api = read('src/admin/adminApi.js');
    for (const fn of [
      'listGameQuestions',
      'publishGameQuestions',
      'restoreGameQuestions',
      'deleteGameQuestions',
    ]) {
      expect(api).toContain(`function ${fn}`);
    }
    expect(api).toContain("callAdmin('list_game_questions'");
    expect(api).toContain("callAdmin('publish_game_questions'");
    expect(api).toContain("callAdmin('restore_game_questions'");
  });

  it('lists Doc metadata and active results state from the admin API', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("from('game_question_docs')");
    expect(api).toContain('activeGameTypes');
    expect(api).toContain('defaultGameId(gameType)');
    expect(api).toContain('Publishing is blocked while the game is active.');
    expect(api).toContain('Restore is blocked while the game is active.');
    const drive = read('supabase/functions/admin_drive/index.ts');
    expect(drive).toContain('resolveWeddingFolderId');
    expect(drive).toContain('cartridge_source_metadata');
  });

  it('mounts both panels in the wedding card', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain("import AdminGamesPanel from './AdminGamesPanel'");
    expect(app).toContain('<AdminGamesPanel');
    expect(app.indexOf('<AdminGamesPanel')).toBeGreaterThan(app.indexOf('<AdminSpeechesPanel'));
  });
});
