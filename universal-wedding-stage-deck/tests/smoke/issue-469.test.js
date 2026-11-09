import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyGameQuestionDocs,
  parseTestWiedzyDoc,
  parseTestZgodnosciDoc,
  PREDEFINED_GAME_STEPS,
} from '../../src/lib/gameQuestions.js';
import { buildGameClicker, resolveGameQuestionLists } from '../../src/lib/games.js';
import { filterEnabledSteps } from '../../src/lib/predefinedSteps.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const wiedzyDoc = `
| Question ID | Level | Question PL | Question FR | Question EN | Answer |
| --- | --- | --- | --- | --- | --- |
| w2 | HARD | Trudne? | Difficile ? | Hard? | BRIDE |
| w1 | EASY | Łatwe? | Facile ? | Easy? | GROOM |
| w3 | MEDIUM | Średnie? | Moyen ? | Medium? | GROOM |
`;

const zgodnosciDoc = `
| Question ID | Question PL | Question FR | Question EN |
| --- | --- | --- | --- |
| z2 | Drugie? | Deuxième ? | Second? |
| z1 | Pierwsze? | Premier ? | First? |
`;

const wedding = {
  coupleProfile: {
    bride: { firstName: 'Jennifer' },
    groom: { firstName: 'Guillaume' },
  },
  games: {
    enabled: true,
    questionLists: [
      {
        id: 'test_wiedzy',
        title: 'Test Wiedzy',
        gameType: 'TEST_WIEDZY',
        enabled: true,
        status: 'AVAILABLE',
        sourceDocId: 'gdoc_test_wiedzy',
        questions: parseTestWiedzyDoc(wiedzyDoc),
      },
      {
        id: 'test_zgodnosci',
        title: 'Test Zgodności',
        gameType: 'TEST_ZGODNOSCI',
        enabled: false,
        status: 'AVAILABLE',
        sourceDocId: 'gdoc_test_zgodnosci',
        questions: parseTestZgodnosciDoc(zgodnosciDoc),
      },
    ],
  },
};

describe('issue #469 predefined game steps and question Docs', () => {
  it('defines exactly two stable predefined game steps', () => {
    expect(PREDEFINED_GAME_STEPS.map((step) => step.gameId)).toEqual([
      'test_wiedzy',
      'test_zgodnosci',
    ]);
    expect(PREDEFINED_GAME_STEPS.every((step) => step.optionalFlag === 'games')).toBe(true);
    expect(PREDEFINED_GAME_STEPS.map((step) => step.gameType)).toEqual([
      'TEST_WIEDZY',
      'TEST_ZGODNOSCI',
    ]);
  });

  it('parses Test Wiedzy localized prompts, answers and EASY→HARD order', () => {
    const questions = parseTestWiedzyDoc(wiedzyDoc);
    expect(questions.map((question) => question.id)).toEqual(['w1', 'w3', 'w2']);
    expect(questions[0]).toMatchObject({
      level: 'EASY',
      answer: 'GROOM',
      prompt: { PL: 'Łatwe?', FR: 'Facile ?', EN: 'Easy?' },
    });
    expect(questions[2].answer).toBe('BRIDE');
  });

  it('parses Test Zgodności in Doc order without answers', () => {
    const questions = parseTestZgodnosciDoc(zgodnosciDoc);
    expect(questions.map((question) => question.id)).toEqual(['z2', 'z1']);
    expect(questions[0]).not.toHaveProperty('answer');
  });

  it('attaches fetched Docs and keeps missing Docs safe', () => {
    const cartridge = {
      games: {
        enabled: true,
        questionLists: [
          { id: 'test_wiedzy', title: 'Test Wiedzy', gameType: 'TEST_WIEDZY', sourceDocId: 'a', status: 'AVAILABLE', questions: [] },
          { id: 'test_zgodnosci', title: 'Test Zgodności', gameType: 'TEST_ZGODNOSCI', sourceDocId: 'b', status: 'AVAILABLE', questions: [] },
        ],
      },
    };
    const next = applyGameQuestionDocs(cartridge, { a: wiedzyDoc, b: zgodnosciDoc });
    expect(next.games.questionLists[0].questions).toHaveLength(3);
    expect(next.games.questionLists[1].questions).toHaveLength(2);
    const missing = applyGameQuestionDocs(cartridge, { a: wiedzyDoc });
    expect(missing.games.questionLists[1]).toMatchObject({ status: 'MISSING', questions: [] });
  });

  it('includes only enabled game steps after the global games flag', () => {
    const steps = [
      { id: 's1', optionalFlag: 'games', gameId: 'test_wiedzy' },
      { id: 's2', optionalFlag: 'games', gameId: 'test_zgodnosci' },
    ];
    expect(filterEnabledSteps({ ...wedding, steps }).map((step) => step.id)).toEqual(['s1']);
    expect(
      filterEnabledSteps({ ...wedding, games: { ...wedding.games, enabled: false }, steps }),
    ).toEqual([]);
  });

  it('builds the clicker with couple first names and safe fallbacks', () => {
    const game = buildGameClicker(wedding, 'test_wiedzy', 'EN');
    expect(game.items[0]).toMatchObject({ question: 'Easy?', answer: 'Guillaume', level: 'EASY' });
    expect(game.items[2].answer).toBe('Jennifer');

    const fallback = buildGameClicker(
      { ...wedding, coupleProfile: {} },
      'test_wiedzy',
      'EN',
    );
    expect(fallback.items[0].answer).toBe('Groom');
    expect(fallback.items[2].answer).toBe('Bride');
  });

  it('exposes safe unavailable state for missing question docs', () => {
    const lists = resolveGameQuestionLists(
      {
        games: {
          enabled: true,
          questionLists: [
            { id: 'test_wiedzy', title: 'Test Wiedzy', status: 'MISSING', questions: [] },
          ],
        },
      },
      'EN',
    );
    expect(lists[0]).toMatchObject({ unavailable: true, questions: [] });
  });

  it('validates the extended schema and example cartridge', async () => {
    const example = JSON.parse(read('schema/wedding-cartridge.example.json'));
    expect(example.games.questionLists.map((list) => list.gameType)).toEqual([
      'TEST_WIEDZY',
      'TEST_ZGODNOSCI',
    ]);
    expect(await validateCartridge(example)).toEqual([]);

    const bad = {
      ...example,
      games: {
        ...example.games,
        questionLists: [
          {
            ...example.games.questionLists[0],
            questions: [{ ...example.games.questionLists[0].questions[0], level: 'EXPERT' }],
          },
        ],
      },
    };
    expect(await validateCartridge(bad)).not.toEqual([]);
  });

  it('fetches question Docs during admin publish, never at runtime', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("from '../_shared/gameQuestions.js'");
    expect(api).toContain('driveConnector.readSource(list.sourceDocId)');
    expect(api).toContain('list.status = questions.length > 0');
    const games = read('src/lib/games.js');
    expect(games).not.toContain('fetch(');
    expect(games).not.toContain('driveConnector');
  });
});
