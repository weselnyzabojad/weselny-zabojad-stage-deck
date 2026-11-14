import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  collectLegacyGameEntries,
  planGameMigration,
  stripLegacyGameQuestions,
} from '../supabase/functions/_shared/gameMigration.js';
import {
  decryptGameBundle,
  encryptGameBundle,
} from '../supabase/functions/_shared/gameBundle.js';
import {
  parseGameQuestionDoc,
  validateGameQuestionPayload,
} from '../supabase/functions/_shared/gameQuestions.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const weddingId = '2026-08-20_test';
const masterKey = 'local-32-byte-random-value-000000';
const wiedzyDocId = 'DriveDocWiedzy1234567890';
const zgodnosciDocId = 'DriveDocZgodnosci1234567890';

const embedded = [
  { id: 'w1', prompt: { PL: 'Gdzie się poznali?', FR: 'Où se sont-ils rencontrés ?' }, level: 'EASY', answer: 'BRIDE' },
  { id: 'w2', prompt: { PL: 'Kto powiedział tak pierwszy?', FR: 'Qui a dit oui en premier ?' }, level: 'HARD', answer: 'GROOM' },
];

function cartridge(overrides = {}) {
  return {
    weddingId,
    extensions: { languages: { supported: ['PL', 'FR'] } },
    liveSyncState: {
      game_results: {
        test_wiedzy: {
          gameId: 'test_wiedzy',
          startedAt: '2026-08-20T22:00:00Z',
          completedAt: '2026-08-20T22:30:00Z',
          answeredCount: 2,
        },
      },
    },
    steps: [
      {
        id: 'game_wiedzy',
        title: 'Test Wiedzy',
        game: {
          id: 'test_wiedzy',
          title: 'Test Wiedzy',
          gameType: 'TEST_WIEDZY',
          enabled: true,
          sourceDocId: wiedzyDocId,
          status: 'AVAILABLE',
          questions: embedded,
        },
      },
      {
        id: 'game_zgodnosci',
        title: 'Test Zgodności',
        game: {
          id: 'test_zgodnosci',
          title: 'Test Zgodności',
          gameType: 'TEST_ZGODNOSCI',
          enabled: false,
          sourceDocId: 'gdoc_test_zgodnosci',
          status: 'MISSING',
        },
      },
    ],
    ...overrides,
  };
}

const docs = [
  {
    game_type: 'TEST_WIEDZY',
    game_id: 'test_wiedzy',
    title: 'Test Wiedzy',
    drive_doc_id: wiedzyDocId,
    drive_folder_id: 'folder_games',
    status: 'PARSED',
  },
];

const linkedChecks = {
  TEST_WIEDZY: {
    readable: true,
    migratable: true,
    sourceDocId: wiedzyDocId,
    questions: embedded,
    file: { id: wiedzyDocId, parents: ['folder_games'] },
  },
};

describe('issue #935 legacy game question migration', () => {
  it('plans a linked game for encrypted bundle migration', () => {
    const plan = planGameMigration({
      cartridge: cartridge(),
      docs,
      checks: linkedChecks,
    });
    expect(plan.games).toHaveLength(2);
    expect(plan.games[0]).toMatchObject({
      gameType: 'TEST_WIEDZY',
      action: 'migrate',
      enabled: true,
      linked: true,
      docReadable: true,
      migratable: true,
      embeddedQuestionCount: 2,
    });
    expect(plan.games[0].questions).toEqual(embedded);
    expect(plan.games[1]).toMatchObject({
      gameType: 'TEST_ZGODNOSCI',
      action: 'metadata',
      enabled: false,
      migratable: false,
    });
    expect(plan.requiresConfirmation).toBe(false);
    expect(plan.hasLegacy).toBe(true);
    expect(plan.questionCount).toBe(2);
  });

  it('requires explicit confirmation before discarding unlinked embedded questions', () => {
    const plan = planGameMigration({ cartridge: cartridge(), docs: [], checks: {} });
    expect(plan.games[0]).toMatchObject({
      action: 'discard',
      reason: 'no-readable-doc',
      embeddedQuestionCount: 2,
    });
    expect(plan.requiresConfirmation).toBe(true);
    expect(plan.unlinkedQuestionCount).toBe(2);

    const stripped = stripLegacyGameQuestions(cartridge());
    expect(JSON.stringify(stripped)).not.toContain('Gdzie się poznali');
    expect(stripped.steps[0].game).toMatchObject({
      id: 'test_wiedzy',
      title: 'Test Wiedzy',
      gameType: 'TEST_WIEDZY',
      enabled: true,
      sourceDocId: wiedzyDocId,
      status: 'AVAILABLE',
    });
    expect(stripped.steps[0].game.questions).toBeUndefined();
    expect(stripped.liveSyncState.game_results.test_wiedzy).toEqual(
      cartridge().liveSyncState.game_results.test_wiedzy,
    );
  });

  it('migrates only metadata for a disabled game and never imports its questions', () => {
    const disabled = cartridge({
      steps: [
        {
          id: 'game_wiedzy',
          title: 'Test Wiedzy',
          game: {
            id: 'test_wiedzy',
            title: 'Test Wiedzy',
            gameType: 'TEST_WIEDZY',
            enabled: false,
            sourceDocId: wiedzyDocId,
            questions: embedded,
          },
        },
      ],
    });
    const plan = planGameMigration({
      cartridge: disabled,
      docs,
      checks: linkedChecks,
    });
    expect(plan.games[0]).toMatchObject({
      action: 'discard',
      reason: 'game-disabled',
      enabled: false,
      migratable: true,
    });
    expect(plan.requiresConfirmation).toBe(true);

    const stripped = stripLegacyGameQuestions(disabled);
    expect(stripped.steps[0].game.enabled).toBe(false);
    expect(stripped.steps[0].game.questions).toBeUndefined();
  });

  it('retries a partially migrated wedding and is idempotent once stripped', () => {
    const partialCartridge = cartridge();
    partialCartridge.steps[1].game.enabled = true;
    partialCartridge.steps[1].game.questions = [
      { id: 'z1', prompt: { PL: 'Pytanie zgodności', FR: 'Question de compatibilité' } },
    ];
    const partial = planGameMigration({
      cartridge: partialCartridge,
      docs,
      bundles: [
        {
          game_type: 'TEST_WIEDZY',
          game_id: 'test_wiedzy',
          live_revision: 2,
          question_count: 2,
          status: 'PUBLISHED',
        },
      ],
      checks: {},
    });
    expect(partial.games[0]).toMatchObject({
      action: 'already-migrated',
      bundleRevision: 2,
      embeddedQuestionCount: 2,
    });
    expect(partial.games[1]).toMatchObject({
      action: 'discard',
      embeddedQuestionCount: 1,
    });
    expect(partial.requiresConfirmation).toBe(true);
    expect(partial.hasLegacy).toBe(true);

    const stripped = stripLegacyGameQuestions(partialCartridge);
    expect(stripped.steps[1].game.questions).toBeUndefined();
    const retry = planGameMigration({
      cartridge: stripped,
      docs,
      bundles: [
        { game_type: 'TEST_WIEDZY', live_revision: 2, question_count: 2 },
        { game_type: 'TEST_ZGODNOSCI', live_revision: 1, question_count: 4 },
      ],
      checks: {},
    });
    expect(retry.hasLegacy).toBe(false);
    expect(retry.questionCount).toBe(0);
    expect(retry.games.every((game) => game.action === 'already-migrated')).toBe(true);
    expect(stripLegacyGameQuestions(stripped)).toEqual(stripped);
  });

  it('requires confirmation for unsupported legacy game lists instead of silently stripping them', () => {
    const legacy = cartridge({
      steps: [],
      games: {
        enabled: true,
        questionLists: [
          {
            id: 'photo_game',
            title: 'Photo Game',
            gameType: 'OTHER',
            enabled: true,
            questions: [{ id: 'p1', prompt: { PL: 'Pytanie' } }],
          },
        ],
      },
    });
    const plan = planGameMigration({ cartridge: legacy });
    expect(plan.unknownLegacyQuestionCount).toBe(1);
    expect(plan.requiresConfirmation).toBe(true);
    expect(plan.questionCount).toBe(1);
    expect(stripLegacyGameQuestions(legacy).games).toBeUndefined();
  });

  it('folds legacy games.questionLists metadata into the step and drops questions', () => {
    const legacy = {
      weddingId,
      extensions: { languages: { supported: ['PL'] } },
      games: {
        enabled: true,
        questionLists: [
          {
            id: 'test_zgodnosci',
            title: 'Test Zgodności',
            gameType: 'TEST_ZGODNOSCI',
            enabled: false,
            sourceDocId: zgodnosciDocId,
            status: 'AVAILABLE',
            questions: [{ id: 'z1', prompt: { PL: 'Pytanie' } }],
          },
        ],
      },
      steps: [{ id: 'game_zgodnosci', title: 'Test Zgodności' }],
    };
    expect(collectLegacyGameEntries(legacy)[0]).toMatchObject({
      gameType: 'TEST_ZGODNOSCI',
      enabled: false,
      embeddedQuestionCount: 1,
    });

    const stripped = stripLegacyGameQuestions(legacy);
    expect(stripped.games).toBeUndefined();
    expect(stripped.steps[0].game).toEqual({
      id: 'test_zgodnosci',
      title: 'Test Zgodności',
      gameType: 'TEST_ZGODNOSCI',
      enabled: false,
      sourceDocId: zgodnosciDocId,
      status: 'AVAILABLE',
    });
    expect(JSON.stringify(stripped)).not.toContain('Pytanie');
  });

  it('round-trips ordered BRIDE/GROOM questions through the encrypted bundle', async () => {
    const markdown = [
      '| Question ID | Question PL | Question FR | Level | Answer |',
      '| --- | --- | --- | --- | --- |',
      '| w2 | Kto powiedział tak pierwszy? | Qui a dit oui en premier ? | HARD | groom |',
      '| w1 | Gdzie się poznali? | Où se sont-ils rencontrés ? | EASY | bride |',
    ].join('\n');
    const parsed = parseGameQuestionDoc(markdown, 'TEST_WIEDZY', {
      languages: ['PL', 'FR'],
    });
    expect(parsed.errors).toEqual([]);
    expect(parsed.questions.map((question) => question.id)).toEqual(['w1', 'w2']);
    const validated = validateGameQuestionPayload({
      gameType: 'TEST_WIEDZY',
      gameId: 'test_wiedzy',
      title: 'Test Wiedzy',
      sourceDocId: wiedzyDocId,
      questions: parsed.questions,
    });
    expect(validated.error).toBeUndefined();
    expect(validated.value.questions.map((question) => question.answer)).toEqual([
      'BRIDE',
      'GROOM',
    ]);

    const entry = await encryptGameBundle({
      masterKey,
      weddingId,
      gameType: 'TEST_WIEDZY',
      revision: 1,
      questions: validated.value.questions,
    });
    expect(entry.ciphertext).not.toContain('Gdzie');
    await expect(
      decryptGameBundle({
        masterKey,
        weddingId,
        gameType: 'TEST_WIEDZY',
        revision: 1,
        entry,
      }),
    ).resolves.toEqual(validated.value.questions);
  });

  it('adds owner-triggered preflight and migration actions', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("action === 'preflight_game_migration'");
    expect(api).toContain("action === 'migrate_game_questions'");
    expect(api).toContain('planGameMigration');
    expect(api).toContain('stripLegacyGameQuestions');
    expect(api).toContain('game_question_migration_import');
    expect(api).toContain('game_question_migration_discard');
    expect(api).toContain('discardUnlinked');
    expect(api).toContain('requiresConfirmation');
    expect(api).toContain("writeAudit(admin, allowlisted, 'game_migration'");
    expect(api).toContain('alreadyMigrated');
    expect(api).toContain('Unlinked legacy game questions will lose their text.');
    expect(api).toContain('Game questions cannot be migrated while a results session is active.');
  });

  it('reads the linked Doc, validates it and republishes the stripped cartridge', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain('driveConnector.readSource');
    expect(api).toContain('parseGameQuestionDoc');
    expect(api).toContain('validateGameQuestionPayload');
    const handler = api.slice(api.indexOf("action === 'migrate_game_questions'"));
    expect(handler).toContain('encryptGameBundle');
    expect(handler).toContain('normalizePublishRequest');
    expect(handler).toContain('publishCartridge');
    expect(handler).toContain('expectedRevision: Number(wedding.cartridge_revision ?? 0)');
    expect(handler).not.toContain('updateGoogleDocText');
    expect(handler).not.toContain('deleteFile');
    expect(handler.indexOf('stripLegacyGameQuestions')).toBeLessThan(
      handler.indexOf('publishCartridge'),
    );
  });

  it('surfaces preflight, both games and confirmation in the admin panel', () => {
    const panel = read('src/admin/AdminGamesPanel.jsx');
    expect(panel).toContain('preflightGameMigration');
    expect(panel).toContain('migrateGameQuestions');
    expect(panel).toContain('Legacy game question migration');
    expect(panel).toContain('Google Docs are never deleted or modified');
    expect(panel).toContain('Migrate game questions');
    expect(panel).toContain('discardUnlinked');
    expect(panel).toContain('embeddedQuestionCount');
    const api = read('src/admin/adminApi.js');
    expect(api).toContain("callAdmin('preflight_game_migration'");
    expect(api).toContain("callAdmin('migrate_game_questions'");
  });
});
