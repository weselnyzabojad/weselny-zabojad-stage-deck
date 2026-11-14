// Parses the dedicated Test Wiedzy / Test Zgodności question Docs into the
// encrypted game question bundle. These are admin-time parsers; the stage never
// scrapes Docs.
//
// Issue #932: question Docs use one column per `extensions.languages.supported`
// entry in that order. The Doc keeps the stable `|` table format used by the
// speech Doc template; question text is copied verbatim.

export const GAME_TYPES = Object.freeze({
  TEST_WIEDZY: 'TEST_WIEDZY',
  TEST_ZGODNOSCI: 'TEST_ZGODNOSCI',
});

export const WIEDZY_LEVELS = ['EASY', 'MEDIUM', 'HARD'];
export const GAME_QUESTION_ANSWERS = ['BRIDE', 'GROOM'];

export const QUESTION_ID_COLUMN = 'Question ID';
export const QUESTION_LEVEL_COLUMN = 'Level';
export const QUESTION_ANSWER_COLUMN = 'Answer';

const QUESTION_COLUMN = /^Question\s+([A-Za-z]{2})$/i;
const TABLE_SEPARATOR = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;
const LANGUAGE_CODE = /^[A-Z]{2}$/;

export function normalizeGameType(value) {
  const type = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return GAME_TYPES[type] ?? null;
}

export function gameTypeLabel(gameType) {
  return normalizeGameType(gameType) === GAME_TYPES.TEST_ZGODNOSCI
    ? 'Test Zgodności'
    : 'Test Wiedzy';
}

export function defaultGameId(gameType) {
  return normalizeGameType(gameType) === GAME_TYPES.TEST_ZGODNOSCI
    ? 'test_zgodnosci'
    : 'test_wiedzy';
}

export function defaultGameTitle(gameType) {
  return gameTypeLabel(gameType);
}

// Returns null when the list is not an array or contains a non ISO 639-1 value.
// Duplicates are rejected because the Doc column order must stay unambiguous.
export function normalizeGameLanguages(languages) {
  if (!Array.isArray(languages)) return null;
  const out = [];
  const seen = new Set();
  for (const raw of languages) {
    const code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
    if (!LANGUAGE_CODE.test(code) || seen.has(code)) return null;
    seen.add(code);
    out.push(code);
  }
  return out;
}

export function gameQuestionDocColumns(gameType, languages) {
  const type = normalizeGameType(gameType);
  if (!type) throw new Error('A game type is required.');
  const codes = normalizeGameLanguages(languages);
  if (!codes || codes.length === 0) {
    throw new Error('At least one ISO 639-1 language is required.');
  }
  const columns = [{ key: 'id', header: QUESTION_ID_COLUMN }];
  for (const code of codes) {
    columns.push({ key: `prompt.${code}`, header: `Question ${code}`, language: code });
  }
  if (type === GAME_TYPES.TEST_WIEDZY) {
    columns.push({ key: 'level', header: QUESTION_LEVEL_COLUMN });
    columns.push({ key: 'answer', header: QUESTION_ANSWER_COLUMN });
  }
  return columns;
}

export function gameQuestionDocFileName(gameType, weddingId) {
  const id = String(weddingId ?? '').trim();
  if (!id) throw new Error('A wedding id is required.');
  return `${gameTypeLabel(gameType)} - ${id}`.replace(/[\\/:*?"<>|]/g, ' ').slice(0, 180);
}

// Drive segments relative to the wedding tree/folder. Zgodności lives in the
// private compatibility folder; Wiedzy lives in the wedding's games folder.
export function gameQuestionDocFolderSegments(gameType, weddingId = '') {
  if (normalizeGameType(gameType) === GAME_TYPES.TEST_ZGODNOSCI) {
    const id = String(weddingId ?? '').trim();
    if (!id) throw new Error('A wedding id is required for the Test Zgodności folder.');
    return ['secrets', id, 'compatibility-test-game'];
  }
  return ['games'];
}

export function buildGameQuestionDocTemplate({ gameType, languages } = {}) {
  const columns = gameQuestionDocColumns(gameType, languages);
  const header = `| ${columns.map((column) => column.header).join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  return [`# ${gameTypeLabel(gameType)}`, '', header, separator, ''].join('\n');
}

// Preflight for the create action. A Doc is never created for a disabled game
// or without the ordered language list.
export function gameQuestionDocCreatePreflight({ gameType, enabled, languages } = {}) {
  const type = normalizeGameType(gameType);
  if (!type) {
    return { code: 'invalid_game_type', error: 'gameType must be TEST_WIEDZY or TEST_ZGODNOSCI.' };
  }
  if (enabled !== true) {
    return { code: 'game_disabled', error: 'The game is disabled. Enable it before creating a Doc.' };
  }
  const codes = normalizeGameLanguages(languages);
  if (!codes) {
    return {
      code: 'invalid_languages',
      error: 'languages must be an ordered list of unique ISO 639-1 codes.',
    };
  }
  if (codes.length === 0) {
    return {
      code: 'missing_languages',
      error: 'The order content languages list is missing. Add at least one language first.',
    };
  }
  return { value: { gameType: type, languages: codes } };
}

function cells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parseFirstTable(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/);
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].trim().startsWith('|')) continue;
    if (!TABLE_SEPARATOR.test(lines[index + 1])) continue;
    const header = cells(lines[index]);
    const rows = [];
    let end = index + 2;
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      if (!lines[rowIndex].trim().startsWith('|')) break;
      rows.push(cells(lines[rowIndex]));
      end = rowIndex + 1;
    }
    return { header, rows, start: index, end };
  }
  return { header: [], rows: [], start: -1, end: -1 };
}

function questionColumns(header) {
  const columns = [];
  for (let index = 0; index < header.length; index += 1) {
    if (header[index] === QUESTION_ID_COLUMN) continue;
    const match = QUESTION_COLUMN.exec(header[index]);
    if (match) columns.push({ language: match[1].toUpperCase(), index });
  }
  return columns;
}

function columnError(code, message, extra = {}) {
  return { code, message, ...extra };
}

export function parseGameQuestionDoc(markdown, gameType, { languages } = {}) {
  const type = normalizeGameType(gameType);
  if (!type) {
    return {
      questions: [],
      errors: [columnError('invalid_game_type', 'gameType must be TEST_WIEDZY or TEST_ZGODNOSCI.')],
      header: [],
      languages: [],
    };
  }

  const suppliedLanguages = languages === undefined ? null : normalizeGameLanguages(languages);
  if (languages !== undefined && !suppliedLanguages) {
    return {
      questions: [],
      errors: [
        columnError(
          'invalid_languages',
          'languages must be an ordered list of unique ISO 639-1 codes.',
        ),
      ],
      header: [],
      languages: [],
    };
  }
  if (suppliedLanguages && suppliedLanguages.length === 0) {
    return {
      questions: [],
      errors: [columnError('missing_languages', 'At least one language column is required.')],
      header: [],
      languages: [],
    };
  }

  const table = parseFirstTable(markdown);
  if (table.header.length === 0) {
    return {
      questions: [],
      errors: [columnError('no_table', 'No question table was found in the Doc.')],
      header: [],
      languages: [],
    };
  }

  const errors = [];
  const header = table.header;
  const questionCols = questionColumns(header);
  const headerLanguages = questionCols.map((column) => column.language);
  const expectedLanguages = suppliedLanguages ?? headerLanguages;

  if (header[0] !== QUESTION_ID_COLUMN) {
    errors.push(columnError('missing_id_column', 'The first column must be "Question ID".'));
  }

  const duplicateLanguages = headerLanguages.filter(
    (language, index) => headerLanguages.indexOf(language) !== index,
  );
  for (const language of new Set(duplicateLanguages)) {
    errors.push(
      columnError('duplicate_language_column', `The Doc has more than one Question ${language} column.`, {
        language,
      }),
    );
  }

  for (const language of expectedLanguages) {
    if (!headerLanguages.includes(language)) {
      errors.push(
        columnError('missing_language_column', `The Doc is missing the Question ${language} column.`, {
          language,
        }),
      );
    }
  }
  for (const language of headerLanguages) {
    if (!expectedLanguages.includes(language)) {
      errors.push(
        columnError('unexpected_language_column', `Question ${language} is not in the supported languages.`, {
          language,
        }),
      );
    }
  }
  if (
    !duplicateLanguages.length &&
    headerLanguages.length === expectedLanguages.length &&
    headerLanguages.every((language) => expectedLanguages.includes(language)) &&
    headerLanguages.join('|') !== expectedLanguages.join('|')
  ) {
    errors.push(
      columnError('language_order_mismatch', 'Language columns must follow extensions.languages.supported order.'),
    );
  }

  const levelIndex = header.findIndex((name) => name === QUESTION_LEVEL_COLUMN);
  const answerIndex = header.findIndex((name) => name === QUESTION_ANSWER_COLUMN);
  const knownColumns = new Set([
    QUESTION_ID_COLUMN,
    ...headerLanguages.map((language) => `Question ${language}`),
    QUESTION_LEVEL_COLUMN,
    QUESTION_ANSWER_COLUMN,
  ]);
  for (const name of header) {
    if (name && !knownColumns.has(name)) {
      errors.push(columnError('unexpected_column', `Unexpected column "${name}".`));
    }
  }

  if (type === GAME_TYPES.TEST_WIEDZY) {
    if (levelIndex < 0) {
      errors.push(columnError('missing_level_column', 'The Doc is missing the "Level" column.'));
    }
    if (answerIndex < 0) {
      errors.push(columnError('missing_answer_column', 'The Doc is missing the "Answer" column.'));
    }
    const expectedHeader = [
      QUESTION_ID_COLUMN,
      ...expectedLanguages.map((language) => `Question ${language}`),
      QUESTION_LEVEL_COLUMN,
      QUESTION_ANSWER_COLUMN,
    ];
    if (
      expectedHeader.every((name) => header.includes(name)) &&
      header.join('|') !== expectedHeader.join('|')
    ) {
      errors.push(
        columnError('column_order_mismatch', 'Columns must be Question ID, language columns, Level, Answer.'),
      );
    }
  } else {
    if (levelIndex >= 0) {
      errors.push(columnError('unexpected_column', 'Test Zgodności has no "Level" column.'));
    }
    if (answerIndex >= 0) {
      errors.push(columnError('unexpected_column', 'Test Zgodności has no "Answer" column.'));
    }
    const expectedHeader = [
      QUESTION_ID_COLUMN,
      ...expectedLanguages.map((language) => `Question ${language}`),
    ];
    if (
      expectedHeader.every((name) => header.includes(name)) &&
      header.join('|') !== expectedHeader.join('|')
    ) {
      errors.push(columnError('column_order_mismatch', 'Columns must be Question ID followed by language columns.'));
    }
  }

  const questions = [];
  const ids = new Set();
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const values = table.rows[rowIndex];
    if (values.every((value) => value === '')) continue;
    if (values.length > header.length) {
      errors.push(
        columnError('malformed_row', `Row ${rowIndex + 1} has more cells than the header.`, {
          row: rowIndex + 1,
        }),
      );
    }
    const cell = (index) => (index >= 0 ? values[index] ?? '' : '');
    const id = cell(0);
    if (!id) {
      errors.push(columnError('missing_question_id', `Row ${rowIndex + 1} has no question id.`, {
        row: rowIndex + 1,
      }));
    } else if (ids.has(id)) {
      errors.push(columnError('duplicate_question_id', `Duplicate question id: ${id}.`, { id }));
    } else {
      ids.add(id);
    }

    const prompt = {};
    for (const column of questionCols) {
      const value = cell(column.index);
      if (!value) {
        errors.push(
          columnError(
            'empty_prompt',
            `Question ${id || rowIndex + 1} is empty in ${column.language}.`,
            { id: id || null, language: column.language },
          ),
        );
      } else {
        prompt[column.language] = value;
      }
    }

    const question = { id, prompt, docOrder: rowIndex };
    if (type === GAME_TYPES.TEST_WIEDZY) {
      const level = cell(levelIndex).toUpperCase();
      const answer = cell(answerIndex).toUpperCase();
      if (!WIEDZY_LEVELS.includes(level)) {
        errors.push(
          columnError('invalid_level', `Question ${id || rowIndex + 1} has an invalid Level.`, {
            id: id || null,
          }),
        );
      } else {
        question.level = level;
      }
      if (!GAME_QUESTION_ANSWERS.includes(answer)) {
        errors.push(
          columnError('invalid_answer', `Question ${id || rowIndex + 1} must answer BRIDE or GROOM.`, {
            id: id || null,
          }),
        );
      } else {
        question.answer = answer;
      }
    }
    questions.push(question);
  }

  if (questions.length === 0) {
    errors.push(columnError('empty_set', 'The Doc contains no questions.'));
  }

  let ordered = questions;
  if (type === GAME_TYPES.TEST_WIEDZY) {
    ordered = [...questions].sort((left, right) => {
      const leftRank = left.level ? WIEDZY_LEVELS.indexOf(left.level) : WIEDZY_LEVELS.length;
      const rightRank = right.level ? WIEDZY_LEVELS.indexOf(right.level) : WIEDZY_LEVELS.length;
      return leftRank - rightRank || left.docOrder - right.docOrder;
    });
  }

  return {
    questions: ordered.map(({ docOrder: _docOrder, ...question }) => question),
    errors,
    header,
    languages: expectedLanguages,
  };
}

export function parseTestWiedzyDoc(markdown, options = {}) {
  return parseGameQuestionDoc(markdown, GAME_TYPES.TEST_WIEDZY, options).questions;
}

export function parseTestZgodnosciDoc(markdown, options = {}) {
  return parseGameQuestionDoc(markdown, GAME_TYPES.TEST_ZGODNOSCI, options).questions;
}

// Rebuilds only the table header and cell positions. Existing question text is
// copied verbatim; new language cells stay empty so the owner must fill them.
// The caller sets the review flag and forces a re-parse.
export function rebuildGameQuestionDocColumns(markdown, gameType, languages) {
  const type = normalizeGameType(gameType);
  if (!type) throw new Error('A game type is required.');
  const codes = normalizeGameLanguages(languages);
  if (!codes || codes.length === 0) {
    throw new Error('At least one ISO 639-1 language is required.');
  }
  const columns = gameQuestionDocColumns(type, codes);
  const table = parseFirstTable(markdown);
  if (table.header.length === 0) throw new Error('No question table was found in the Doc.');

  const canonical = (name) => {
    const match = QUESTION_COLUMN.exec(name);
    return match ? `Question ${match[1].toUpperCase()}` : name;
  };
  const oldIndex = new Map(table.header.map((name, index) => [canonical(name), index]));
  const oldLanguages = questionColumns(table.header).map((column) => column.language);
  const newLanguages = columns.filter((column) => column.language).map((column) => column.language);
  const removedLanguages = oldLanguages.filter((language) => !newLanguages.includes(language));
  const addedLanguages = newLanguages.filter((language) => !oldLanguages.includes(language));
  const keptColumns = new Set(columns.map((column) => column.header));
  const droppedColumns = table.header.filter((name) => !keptColumns.has(canonical(name)));

  const newHeader = columns.map((column) => column.header);
  const newRows = table.rows.map((values) =>
    newHeader.map((name) => {
      const index = oldIndex.get(name);
      return index === undefined ? '' : values[index] ?? '';
    }),
  );
  const formatRow = (row) => `| ${row.join(' | ')} |`;
  const tableLines = [
    formatRow(newHeader),
    formatRow(newHeader.map(() => '---')),
    ...newRows.map(formatRow),
  ];

  const lines = String(markdown ?? '').split(/\r?\n/);
  const text = [
    ...lines.slice(0, table.start),
    ...tableLines,
    ...lines.slice(table.end),
  ].join('\n');

  return {
    text,
    changed: text !== String(markdown ?? ''),
    languages: codes,
    header: newHeader,
    rows: newRows,
    addedLanguages,
    removedLanguages,
    droppedColumns,
  };
}

// Question Docs keep the stable BRIDE/GROOM placeholders; the published
// cartridge stores the couple's first names so the answer never reads as a role.
function resolveAnswer(answer, brideName, groomName) {
  if (typeof answer !== 'string') return answer;
  const token = answer.trim().toUpperCase();
  if (token === 'BRIDE' && brideName) return brideName;
  if (token === 'GROOM' && groomName) return groomName;
  return answer;
}

// Legacy admin publish helper kept for existing callers. New edits use the
// manual parse action exposed by the admin Drive surface.
export function applyGameQuestionDocs(cartridge, docsById = {}) {
  const steps = Array.isArray(cartridge?.steps) ? cartridge.steps : [];
  if (!steps.some((step) => step?.game)) return cartridge;
  const brideName = cartridge?.coupleProfile?.bride?.firstName ?? null;
  const groomName = cartridge?.coupleProfile?.groom?.firstName ?? null;
  return {
    ...cartridge,
    steps: steps.map((step) => {
      const list = step?.game;
      if (!list) return step;
      const textDoc = docsById[list.sourceDocId];
      if (typeof textDoc !== 'string' || !textDoc.trim()) {
        return {
          ...step,
          game:
            list.status === 'AVAILABLE' && list.questions?.length
              ? list
              : { ...list, status: 'MISSING', questions: [] },
        };
      }
      const parsed = parseGameQuestionDoc(textDoc, list.gameType);
      const questions = parsed.questions.map((question) => ({
        ...question,
        ...(typeof question.answer === 'string'
          ? { answer: resolveAnswer(question.answer, brideName, groomName) }
          : {}),
      }));
      return {
        ...step,
        game: {
          ...list,
          status: questions.length > 0 ? 'AVAILABLE' : 'UNAVAILABLE',
          questions,
        },
      };
    }),
  };
}

export const PREDEFINED_GAME_STEPS = Object.freeze([
  {
    id: 'test_wiedzy',
    gameType: GAME_TYPES.TEST_WIEDZY,
    title: 'Test Wiedzy',
  },
  {
    id: 'test_zgodnosci',
    gameType: GAME_TYPES.TEST_ZGODNOSCI,
    title: 'Test Zgodności',
  },
]);

export function isPredefinedGameStep(step) {
  return (
    step?.game?.gameType === GAME_TYPES.TEST_WIEDZY ||
    step?.game?.gameType === GAME_TYPES.TEST_ZGODNOSCI
  );
}
