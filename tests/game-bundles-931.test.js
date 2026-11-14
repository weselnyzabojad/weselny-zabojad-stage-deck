import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  decryptGameBundle,
  deriveGameKeyBytes,
  encryptGameBundle,
} from '../supabase/functions/_shared/gameBundle.js';
import { deriveSpeechKeyBytes } from '../supabase/functions/_shared/speechSecrets.js';
import {
  isGameActive,
  validateGameQuestionPayload,
} from '../supabase/functions/_shared/gameQuestions.js';
import { sanitizeCartridge as sanitizeServerCartridge } from '../supabase/functions/_shared/cartridgeSemantics.js';
import { sanitizeCartridge as sanitizeClientCartridge } from '../src/lib/cartridgeImporter.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));

const masterKey = 'local-32-byte-random-value-000000';
const weddingId = 'Test&Wedding-UM-2026-08-001';
const questions = [
  {
    id: 'w01',
    prompt: { PL: 'Gdzie się poznali?', FR: 'Où se sont-ils rencontrés ?', EN: 'Where did they meet?' },
    level: 'EASY',
    answer: 'BRIDE',
  },
];

function validPayload(overrides = {}) {
  return {
    gameType: 'TEST_WIEDZY',
    gameId: 'test_wiedzy',
    title: 'Test Wiedzy',
    sourceDocId: 'gdoc_test_wiedzy',
    questions,
    ...overrides,
  };
}

describe('issue #931 encrypted game question bundles', () => {
  it('round-trips the whole question set with AES-256-GCM', async () => {
    const entry = await encryptGameBundle({
      masterKey,
      weddingId,
      gameType: 'TEST_WIEDZY',
      revision: 2,
      questions,
    });
    expect(entry.alg).toBe('AES-256-GCM');
    expect(entry.revision).toBe(2);
    expect(entry.ciphertext).not.toContain('Gdzie');
    expect(entry.ciphertext).not.toContain('Where did');

    await expect(
      decryptGameBundle({
        masterKey,
        weddingId,
        gameType: 'TEST_WIEDZY',
        revision: 2,
        entry,
      }),
    ).resolves.toEqual(questions);
  });

  it('binds the ciphertext to the wedding, game type and revision', async () => {
    const entry = await encryptGameBundle({
      masterKey,
      weddingId,
      gameType: 'TEST_WIEDZY',
      revision: 2,
      questions,
    });
    for (const mismatch of [
      { weddingId: 'Other&Wedding-UM-2026-08-002' },
      { gameType: 'TEST_ZGODNOSCI' },
      { revision: 3 },
    ]) {
      await expect(
        decryptGameBundle({
          masterKey,
          weddingId,
          gameType: 'TEST_WIEDZY',
          revision: 2,
          entry,
          ...mismatch,
        }),
      ).rejects.toBeTruthy();
    }
  });

  it('scopes game keys per game type and away from speech keys', async () => {
    const [wiedzy, zgodnosci, speech] = await Promise.all([
      deriveGameKeyBytes({ masterKey, weddingId, gameType: 'TEST_WIEDZY' }),
      deriveGameKeyBytes({ masterKey, weddingId, gameType: 'TEST_ZGODNOSCI' }),
      deriveSpeechKeyBytes(masterKey, weddingId, 'TEST_WIEDZY', 1),
    ]);
    const hex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    expect(hex(wiedzy)).not.toBe(hex(zgodnosci));
    expect(hex(wiedzy)).not.toBe(hex(speech));
  });

  it('keeps BRIDE/GROOM tokens and rejects invalid content', () => {
    const valid = validateGameQuestionPayload(validPayload({ questions: [{ ...questions[0], answer: 'bride' }] }));
    expect(valid.value.questions[0].answer).toBe('BRIDE');

    for (const invalid of [
      validPayload({ gameType: 'OTHER' }),
      validPayload({ questions: [] }),
      validPayload({ questions: [{ id: 'w1', prompt: {} }] }),
      validPayload({ questions: [questions[0], questions[0]] }),
      validPayload({ questions: [{ ...questions[0], level: 'EXPERT' }] }),
    ]) {
      expect(validateGameQuestionPayload(invalid).error).toBeTruthy();
    }
  });

  it('detects an active results session for the matching game only', () => {
    const liveState = {
      game_results: {
        test_wiedzy: { gameId: 'test_wiedzy', startedAt: '2026-08-20T22:00:00Z' },
        test_zgodnosci: {
          gameId: 'test_zgodnosci',
          startedAt: '2026-08-20T21:00:00Z',
          completedAt: '2026-08-20T21:30:00Z',
        },
      },
    };
    expect(isGameActive(liveState, { gameId: 'test_wiedzy', gameType: 'TEST_WIEDZY' })).toBe(true);
    expect(
      isGameActive(liveState, { gameId: 'test_zgodnosci', gameType: 'TEST_ZGODNOSCI' }),
    ).toBe(false);
    expect(isGameActive({}, { gameId: 'test_wiedzy', gameType: 'TEST_WIEDZY' })).toBe(false);
  });

  it('strips question text from both server and client published cartridges', () => {
    const cartridge = json('schema/wedding-cartridge.example.json');
    const gameStep = cartridge.steps.find((step) => step.game);
    gameStep.game.questions = questions;
    cartridge.games = {
      enabled: true,
      questionLists: [{ ...gameStep.game }],
    };

    for (const clean of [
      sanitizeServerCartridge(cartridge),
      sanitizeClientCartridge(cartridge),
    ]) {
      expect(clean.games).toBeUndefined();
      for (const step of clean.steps) {
        if (step.game) expect(step.game.questions).toBeUndefined();
      }
    }

    const schema = json('schema/domains/steps.json');
    expect(schema.$defs.game.properties.questions).toBeUndefined();
    expect(read('schema/domains/steps.json')).toBe(
      read('supabase/functions/_shared/domains/steps.json'),
    );
    for (const path of ['schema/wedding-cartridge.example.json', 'schema/fixtures/real-jennifer-guillaume.json']) {
      const published = json(path);
      expect(published.steps.some((step) => step.game?.questions)).toBe(false);
    }
    expect(read('src/demo/demoWedding.js')).not.toContain('questions: [');
  });

  it('defines service-role-only bundle, revision and log tables', () => {
    const sql = read('supabase/migrations/202611140006_game_question_bundles.sql');
    for (const table of [
      'game_question_bundles',
      'game_question_revisions',
      'game_question_logs',
    ]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`revoke all on public.${table}`);
      expect(sql).toContain(`alter table public.${table}`);
    }
    expect(sql).toContain('primary key (wedding_id, game_type)');
    expect(sql).toContain('primary key (wedding_id, game_type, revision)');
    expect(sql).toContain('on delete cascade');
    expect(sql).toContain('game_question_revisions are immutable');
    expect(sql).toContain("interval '90 days'");
    expect(sql).toContain('enable row level security');
  });

  it('publishes, restores and deletes each game independently with active guards', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    for (const action of [
      'list_game_questions',
      'publish_game_questions',
      'restore_game_questions',
      'delete_game_questions',
    ]) {
      expect(api).toContain(`action === '${action}'`);
    }
    expect(api).toContain('Publishing is blocked while the game is active.');
    expect(api).toContain('Restore is blocked while the game is active.');
    expect(api).toContain('Delete is blocked while the game is active.');
    expect(api).toContain('game_questions_publish_invalid');
    expect(api).toContain('game_question_logs');
    expect(api).toContain('eq(\'game_type\', gameType)');
    expect(api).toContain('encryptGameBundle');
    expect(api).toContain('decryptGameBundle');
    expect(api).not.toContain('applyGameQuestionDocs');
    // #935 intentionally reads and parses the linked Drive Doc only inside the
    // owner-triggered migration action; normal publishes never parse Docs.
    expect(api).toContain("action === 'migrate_game_questions'");
  });

  it('fails an invalid publish before writing a revision', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    const handler = api.slice(api.indexOf("action === 'publish_game_questions'"));
    const invalidCheck = handler.indexOf('if (validated.error)');
    const revisionRead = handler.indexOf("from('game_question_revisions')");
    const insert = handler.indexOf("from('game_question_revisions').insert");
    expect(invalidCheck).toBeGreaterThan(-1);
    expect(revisionRead).toBeGreaterThan(invalidCheck);
    expect(insert).toBeGreaterThan(revisionRead);
  });

  it('projects ciphertext and keys only to the MC role', () => {
    const fn = read('supabase/functions/game_bundle/index.ts');
    expect(fn).toContain("new Set(['mc', 'dj_mc'])");
    expect(fn).toContain('Only the MC can read game questions.');
    expect(fn).toContain("action === 'list'");
    expect(fn).toContain("action === 'key'");
    expect(fn).toContain("from('game_question_bundles')");
    expect(fn).toContain("eq('status', 'PUBLISHED')");
    expect(fn).toContain('deriveGameKeyBytes');
    expect(fn).toContain('ciphertext');
    expect(fn).not.toContain('decryptGameBundle');
  });
});
