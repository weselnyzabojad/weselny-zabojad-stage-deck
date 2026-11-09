// Parses the dedicated Test Wiedzy / Test Zgodności question Docs into the
// cartridge. These are admin-time parsers; the stage never scrapes Docs.

export const GAME_TYPES = Object.freeze({
  TEST_WIEDZY: 'TEST_WIEDZY',
  TEST_ZGODNOSCI: 'TEST_ZGODNOSCI',
});

export const WIEDZY_LEVELS = ['EASY', 'MEDIUM', 'HARD'];

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
    if (!/^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[index + 1])) continue;
    const header = cells(lines[index]);
    const rows = [];
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      if (!lines[rowIndex].trim().startsWith('|')) break;
      const values = cells(lines[rowIndex]);
      rows.push(Object.fromEntries(header.map((key, cellIndex) => [key, values[cellIndex] ?? ''])));
    }
    return { header, rows };
  }
  return { header: [], rows: [] };
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function localizedPrompt(row) {
  const prompt = {
    PL: text(row['Question PL']),
    FR: text(row['Question FR']),
    EN: text(row['Question EN']),
  };
  return Object.fromEntries(Object.entries(prompt).filter(([, value]) => value));
}

function normalizeAnswer(value) {
  return text(value)?.toUpperCase() === 'BRIDE' ? 'BRIDE' : 'GROOM';
}

function normalizeLevel(value) {
  const level = text(value)?.toUpperCase();
  return WIEDZY_LEVELS.includes(level) ? level : 'EASY';
}

export function parseTestWiedzyDoc(markdown) {
  const { rows } = parseFirstTable(markdown);
  const questions = rows
    .map((row, index) => {
      const id = text(row['Question ID']) ?? `w${index + 1}`;
      const prompt = localizedPrompt(row);
      if (!prompt.PL && !prompt.FR && !prompt.EN) return null;
      return {
        id,
        prompt,
        level: normalizeLevel(row.Level),
        answer: normalizeAnswer(row.Answer),
      };
    })
    .filter(Boolean);

  return questions.sort(
    (a, b) => WIEDZY_LEVELS.indexOf(a.level) - WIEDZY_LEVELS.indexOf(b.level),
  );
}

export function parseTestZgodnosciDoc(markdown) {
  const { rows } = parseFirstTable(markdown);
  return rows
    .map((row, index) => {
      const id = text(row['Question ID']) ?? `z${index + 1}`;
      const prompt = localizedPrompt(row);
      if (!prompt.PL && !prompt.FR && !prompt.EN) return null;
      return { id, prompt };
    })
    .filter(Boolean);
}

export function parseGameQuestionDoc(markdown, gameType) {
  if (gameType === GAME_TYPES.TEST_ZGODNOSCI) return parseTestZgodnosciDoc(markdown);
  return parseTestWiedzyDoc(markdown);
}

// Admin publish helper: attach fetched Doc text to the matching question list.
export function applyGameQuestionDocs(cartridge, docsById = {}) {
  const lists = cartridge?.games?.questionLists;
  if (!Array.isArray(lists)) return cartridge;
  return {
    ...cartridge,
    games: {
      ...cartridge.games,
      questionLists: lists.map((list) => {
        const textDoc = docsById[list.sourceDocId];
        if (typeof textDoc !== 'string' || !textDoc.trim()) {
          return list.status === 'AVAILABLE' && list.questions?.length
            ? list
            : { ...list, status: 'MISSING', questions: [] };
        }
        const questions = parseGameQuestionDoc(textDoc, list.gameType);
        return {
          ...list,
          status: questions.length > 0 ? 'AVAILABLE' : 'UNAVAILABLE',
          questions,
        };
      }),
    },
  };
}

export const PREDEFINED_GAME_STEPS = Object.freeze([
  {
    gameId: 'test_wiedzy',
    gameType: GAME_TYPES.TEST_WIEDZY,
    title: 'Test Wiedzy',
    optionalFlag: 'games',
  },
  {
    gameId: 'test_zgodnosci',
    gameType: GAME_TYPES.TEST_ZGODNOSCI,
    title: 'Test Zgodności',
    optionalFlag: 'games',
  },
]);
