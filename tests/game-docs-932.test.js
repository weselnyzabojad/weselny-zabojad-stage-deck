import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import {
  GAME_TYPES,
  buildGameQuestionDocTemplate,
  gameQuestionDocColumns,
  gameQuestionDocCreatePreflight,
  gameQuestionDocFileName,
  gameQuestionDocFolderPath,
  normalizeGameLanguages,
  parseGameQuestionDoc,
  rebuildGameQuestionDocColumns,
} from '../src/lib/gameQuestions.js';
import {
  parseGameQuestionDoc as parseEdgeGameQuestionDoc,
  validateGameQuestionPayload,
} from '../supabase/functions/_shared/gameQuestions.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));

const table = (header, rows) =>
  [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

const zgodnosciDoc = table(
  ['Question ID', 'Question DE', 'Question PL'],
  [
    ['z2', 'Wo habt ihr euch kennengelernt?', 'Gdzie się poznaliście?'],
    ['z1', 'Wer hat zuerst geschrieben?', 'Kto napisał pierwszy?'],
  ],
);

const wiedzyDoc = table(
  ['Question ID', 'Question FR', 'Question EN', 'Question PL', 'Level', 'Answer'],
  [
    ['w1', 'Difficile ?', 'Hard?', 'Trudne?', 'HARD', 'BRIDE'],
    ['w2', 'Facile ?', 'Easy?', 'Łatwe?', 'EASY', 'GROOM'],
    ['w3', 'Moyen ?', 'Medium?', 'Średnie?', 'MEDIUM', 'BRIDE'],
    ['w4', 'Encore facile ?', 'Easy again?', 'Znowu łatwe?', 'EASY', 'GROOM'],
  ],
);

function compileDomain(path) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(json(path));
}

describe('issue #932 game question Doc templates and parsers', () => {
  it('keeps browser, Node and Edge question schemas byte-identical', () => {
    for (const file of ['test-zgodnosci-questions.json', 'test-wiedzy-questions.json']) {
      expect(read(`schema/domains/${file}`)).toBe(
        read(`supabase/functions/_shared/domains/${file}`),
      );
    }
    expect(json('schema/domains/test-zgodnosci-questions.json').properties.gameType.const).toBe(
      'TEST_ZGODNOSCI',
    );
    expect(json('schema/domains/test-wiedzy-questions.json').$defs.answer.enum).toEqual([
      'BRIDE',
      'GROOM',
    ]);
    expect(json('schema/domains/test-wiedzy-questions.json').$defs.level.enum).toEqual([
      'EASY',
      'MEDIUM',
      'HARD',
    ]);
  });

  it('derives ordered language columns and both Doc templates from the schemas', () => {
    const zgodnosci = buildGameQuestionDocTemplate({
      gameType: GAME_TYPES.TEST_ZGODNOSCI,
      languages: ['de', 'pl'],
    });
    expect(zgodnosci).toContain('| Question ID | Question DE | Question PL |');
    expect(zgodnosci).not.toContain('Level');
    expect(zgodnosci).not.toContain('Answer');

    const wiedzy = buildGameQuestionDocTemplate({
      gameType: GAME_TYPES.TEST_WIEDZY,
      languages: ['FR', 'en', 'PL'],
    });
    expect(wiedzy).toContain(
      '| Question ID | Question FR | Question EN | Question PL | Level | Answer |',
    );
    expect(gameQuestionDocColumns(GAME_TYPES.TEST_WIEDZY, ['FR', 'PL']).map((column) => column.key)).toEqual([
      'id',
      'prompt.FR',
      'prompt.PL',
      'level',
      'answer',
    ]);
    expect(() => buildGameQuestionDocTemplate({ gameType: GAME_TYPES.TEST_WIEDZY, languages: [] })).toThrow();
    expect(normalizeGameLanguages(['pl', 'fr', 'pl'])).toBeNull();
    expect(normalizeGameLanguages(['pl', 'FR'])).toEqual(['PL', 'FR']);
  });

  it('uses the required file names and Drive folders', () => {
    expect(gameQuestionDocFileName(GAME_TYPES.TEST_ZGODNOSCI, 'Test&Wedding-UM-2026-08-001')).toBe(
      'Test Zgodności - Test&Wedding-UM-2026-08-001',
    );
    expect(gameQuestionDocFileName(GAME_TYPES.TEST_WIEDZY, 'Test&Wedding-UM-2026-08-001')).toBe(
      'Test Wiedzy - Test&Wedding-UM-2026-08-001',
    );
    expect(gameQuestionDocFolderPath(GAME_TYPES.TEST_ZGODNOSCI, 'Test&Wedding-UM-2026-08-001')).toEqual({
      scope: 'private',
      segments: ['secrets', 'Test&Wedding-UM-2026-08-001', 'compatibility-test-game'],
    });
    expect(gameQuestionDocFolderPath(GAME_TYPES.TEST_WIEDZY, 'Test&Wedding-UM-2026-08-001')).toEqual({
      scope: 'wedding',
      segments: ['games'],
    });
  });

  it('blocks Doc creation while disabled or without languages', () => {
    expect(
      gameQuestionDocCreatePreflight({
        gameType: GAME_TYPES.TEST_WIEDZY,
        enabled: false,
        languages: ['PL'],
      }).code,
    ).toBe('game_disabled');
    expect(
      gameQuestionDocCreatePreflight({
        gameType: GAME_TYPES.TEST_WIEDZY,
        enabled: true,
        languages: [],
      }).code,
    ).toBe('missing_languages');
    expect(
      gameQuestionDocCreatePreflight({
        gameType: GAME_TYPES.TEST_WIEDZY,
        enabled: true,
        languages: ['Polish'],
      }).code,
    ).toBe('invalid_languages');
    expect(
      gameQuestionDocCreatePreflight({
        gameType: GAME_TYPES.TEST_ZGODNOSCI,
        enabled: true,
        languages: ['PL', 'DE'],
      }).value.languages,
    ).toEqual(['PL', 'DE']);
  });

  it('parses arbitrary language columns and preserves Doc order for Zgodności', () => {
    const parsed = parseGameQuestionDoc(zgodnosciDoc, GAME_TYPES.TEST_ZGODNOSCI, {
      languages: ['DE', 'PL'],
    });
    expect(parsed.errors).toEqual([]);
    expect(parsed.questions.map((question) => question.id)).toEqual(['z2', 'z1']);
    expect(parsed.questions[0]).toEqual({
      id: 'z2',
      prompt: {
        DE: 'Wo habt ihr euch kennengelernt?',
        PL: 'Gdzie się poznaliście?',
      },
    });
    expect(parsed.languages).toEqual(['DE', 'PL']);
  });

  it('parses Wiedzy by level then Doc order and keeps BRIDE/GROOM tokens', () => {
    const parsed = parseGameQuestionDoc(wiedzyDoc, GAME_TYPES.TEST_WIEDZY, {
      languages: ['FR', 'EN', 'PL'],
    });
    expect(parsed.errors).toEqual([]);
    expect(parsed.questions.map((question) => [question.id, question.level])).toEqual([
      ['w2', 'EASY'],
      ['w4', 'EASY'],
      ['w3', 'MEDIUM'],
      ['w1', 'HARD'],
    ]);
    expect(new Set(parsed.questions.map((question) => question.answer))).toEqual(
      new Set(['BRIDE', 'GROOM']),
    );
    expect(parsed.questions[0].prompt).toEqual({
      FR: 'Facile ?',
      EN: 'Easy?',
      PL: 'Łatwe?',
    });
  });

  it('blocks empty sets, duplicate ids, missing language columns and empty prompts', () => {
    expect(
      parseGameQuestionDoc(table(['Question ID', 'Question PL'], []), GAME_TYPES.TEST_ZGODNOSCI, {
        languages: ['PL'],
      }).errors.map((error) => error.code),
    ).toContain('empty_set');

    const duplicate = table(
      ['Question ID', 'Question PL'],
      [
        ['z1', 'Pierwsze?'],
        ['z1', 'Drugie?'],
      ],
    );
    expect(
      parseGameQuestionDoc(duplicate, GAME_TYPES.TEST_ZGODNOSCI, { languages: ['PL'] }).errors.map(
        (error) => error.code,
      ),
    ).toContain('duplicate_question_id');

    expect(
      parseGameQuestionDoc(zgodnosciDoc, GAME_TYPES.TEST_ZGODNOSCI, {
        languages: ['PL', 'EN'],
      }).errors.map((error) => error.code),
    ).toContain('missing_language_column');

    const emptyPrompt = table(
      ['Question ID', 'Question PL', 'Question EN'],
      [['z1', 'Pytanie?', '']],
    );
    const empty = parseGameQuestionDoc(emptyPrompt, GAME_TYPES.TEST_ZGODNOSCI, {
      languages: ['PL', 'EN'],
    });
    expect(empty.errors.map((error) => error.code)).toContain('empty_prompt');
  });

  it('blocks language order drift, unexpected columns and malformed tables', () => {
    expect(
      parseGameQuestionDoc(zgodnosciDoc, GAME_TYPES.TEST_ZGODNOSCI, {
        languages: ['PL', 'DE'],
      }).errors.map((error) => error.code),
    ).toContain('language_order_mismatch');
    expect(
      parseGameQuestionDoc(zgodnosciDoc, GAME_TYPES.TEST_WIEDZY, {
        languages: ['DE', 'PL'],
      }).errors.map((error) => error.code),
    ).toContain('missing_level_column');
    expect(
      parseGameQuestionDoc('Not a table', GAME_TYPES.TEST_WIEDZY, { languages: ['PL'] }).errors[0]
        .code,
    ).toBe('no_table');
  });

  it('blocks an invalid Level or Answer instead of defaulting silently', () => {
    const invalid = table(
      ['Question ID', 'Question PL', 'Level', 'Answer'],
      [
        ['w1', 'Pytanie?', 'EXPERT', 'BRIDE'],
        ['w2', 'Pytanie?', 'EASY', 'BOTH'],
      ],
    );
    const parsed = parseGameQuestionDoc(invalid, GAME_TYPES.TEST_WIEDZY, { languages: ['PL'] });
    expect(parsed.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(['invalid_level', 'invalid_answer']),
    );
  });

  it('rewrites only columns and columns order without changing question text', () => {
    const doc = [
      '# Test Wiedzy',
      '',
      table(
        ['Question ID', 'Question PL', 'Level', 'Answer'],
        [['w1', 'Gdzie się poznali?', 'EASY', 'BRIDE']],
      ),
      '',
      'Owner notes stay here.',
    ].join('\n');
    const rebuilt = rebuildGameQuestionDocColumns(doc, GAME_TYPES.TEST_WIEDZY, ['PL', 'DE']);
    expect(rebuilt.addedLanguages).toEqual(['DE']);
    expect(rebuilt.removedLanguages).toEqual([]);
    expect(rebuilt.text).toContain(
      '| Question ID | Question PL | Question DE | Level | Answer |',
    );
    expect(rebuilt.text).toContain('| w1 | Gdzie się poznali? |  | EASY | BRIDE |');
    expect(rebuilt.text).toContain('Owner notes stay here.');

    const reordered = rebuildGameQuestionDocColumns(
      rebuilt.text,
      GAME_TYPES.TEST_WIEDZY,
      ['DE', 'PL'],
    );
    expect(reordered.text).toContain('| Question ID | Question DE | Question PL | Level | Answer |');
    expect(reordered.text).toContain('Gdzie się poznali?');
    expect(reordered.changed).toBe(true);
  });

  it('keeps the browser and Edge parsers in sync for arbitrary languages', () => {
    for (const [doc, type, languages] of [
      [zgodnosciDoc, GAME_TYPES.TEST_ZGODNOSCI, ['DE', 'PL']],
      [wiedzyDoc, GAME_TYPES.TEST_WIEDZY, ['FR', 'EN', 'PL']],
    ]) {
      expect(parseGameQuestionDoc(doc, type, { languages })).toEqual(
        parseEdgeGameQuestionDoc(doc, type, { languages }),
      );
    }
    const zgodnosciExample = json('schema/domains/test-zgodnosci-questions.example.json');
    const wiedzyExample = json('schema/domains/test-wiedzy-questions.example.json');
    expect(compileDomain('schema/domains/test-zgodnosci-questions.json')(zgodnosciExample)).toBe(true);
    expect(compileDomain('schema/domains/test-wiedzy-questions.json')(wiedzyExample)).toBe(true);
  });

  it('validates parsed sets against both domain schemas and the #931 payload', () => {
    const zgodnosci = parseGameQuestionDoc(zgodnosciDoc, GAME_TYPES.TEST_ZGODNOSCI, {
      languages: ['DE', 'PL'],
    });
    const wiedzy = parseGameQuestionDoc(wiedzyDoc, GAME_TYPES.TEST_WIEDZY, {
      languages: ['FR', 'EN', 'PL'],
    });
    expect(compileDomain('schema/domains/test-zgodnosci-questions.json')({
      gameType: 'TEST_ZGODNOSCI',
      questions: zgodnosci.questions,
    })).toBe(true);
    expect(compileDomain('schema/domains/test-wiedzy-questions.json')({
      gameType: 'TEST_WIEDZY',
      questions: wiedzy.questions,
    })).toBe(true);

    const payload = validateGameQuestionPayload({
      gameType: 'TEST_ZGODNOSCI',
      gameId: 'test_zgodnosci',
      title: 'Test Zgodności',
      sourceDocId: 'gdoc_zgodnosci',
      questions: zgodnosci.questions,
    });
    expect(payload.error).toBeUndefined();
    expect(payload.value.questions[0].prompt).toEqual({
      DE: 'Wo habt ihr euch kennengelernt?',
      PL: 'Gdzie się poznaliście?',
    });
  });

  it('exposes create, rewrite and parse actions with metadata and no delete path', () => {
    const drive = read('supabase/functions/_shared/googleDrive.js');
    for (const method of ['ensureFolderPath', 'createGoogleDoc', 'updateGoogleDocText', 'readSource']) {
      expect(drive).toContain(method);
    }
    expect(drive).toContain('DRIVE_FILE_SCOPE');
    expect(drive).not.toContain('deleteFile');

    const api = read('supabase/functions/admin_drive/index.ts');
    for (const action of [
      'create_game_question_doc',
      'rewrite_game_question_doc_columns',
      'parse_game_question_doc',
    ]) {
      expect(api).toContain(`action === '${action}'`);
    }
    expect(api).toContain("reviewRequired: true");
    expect(api).toContain("status: 'PARSED'");
    expect(api).toContain("progress: ['fetch', 'parse', 'validate', 'encrypt']");
    expect(api).toContain('gameQuestionDocCreatePreflight');
    expect(api).toContain("code: 'wrong_folder'");
    expect(api).not.toContain('deleteFile');
    expect(api).not.toContain('trash');

    const client = read('src/admin/adminApi.js');
    expect(client).toContain('createGameQuestionDoc');
    expect(client).toContain('rewriteGameQuestionDocColumns');
    expect(client).toContain('parseGameQuestionDoc');

    const sql = read('supabase/migrations/202611140007_game_question_docs.sql');
    for (const column of [
      'drive_doc_id',
      'drive_doc_url',
      'drive_doc_name',
      'drive_doc_version',
      'drive_doc_modified_at',
      'drive_doc_retrieved_at',
      'review_required',
      'languages',
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).toContain('revoke all on public.game_question_docs from anon, authenticated');
  });
});
