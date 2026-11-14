// Parses the dedicated Test Wiedzy / Test Zgodności question Docs into the
// cartridge. These are admin-time parsers; the stage never scrapes Docs.

export const GAME_TYPES = Object.freeze({
  TEST_WIEDZY: 'TEST_WIEDZY',
  TEST_ZGODNOSCI: 'TEST_ZGODNOSCI',
});

export const WIEDZY_LEVELS = ['EASY', 'MEDIUM', 'HARD'];
export const GAME_QUESTION_LANGUAGES = ['PL', 'FR', 'EN'];

export function normalizeGameType(value) {
  const type = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return GAME_TYPES[type] ?? null;
}

function cleanQuestionPrompt(value) {
  if (typeof value === 'string') {
    const prompt = value.trim();
    return prompt ? { PL: prompt } : null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prompt = {};
  for (const language of GAME_QUESTION_LANGUAGES) {
    const text = typeof value[language] === 'string' ? value[language].trim() : '';
    if (text) prompt[language] = text;
  }
  return Object.keys(prompt).length > 0 ? prompt : null;
}

function cleanQuestionAnswer(value) {
  if (typeof value !== 'string') return null;
  const answer = value.trim();
  if (!answer) return null;
  return answer.toUpperCase() === 'BRIDE' || answer.toUpperCase() === 'GROOM'
    ? answer.toUpperCase()
    : answer;
}

// Validates the parser-owned question array before it is encrypted. Answer
// names stay as BRIDE/GROOM tokens; the display layer resolves them from
// coupleProfile, so the bundle never stores a resolved person's name.
export function validateGameQuestionPayload(payload) {
  const gameType = normalizeGameType(payload?.gameType);
  if (!gameType) {
    return { error: 'gameType must be TEST_WIEDZY or TEST_ZGODNOSCI.' };
  }

  const gameId = typeof payload?.gameId === 'string' ? payload.gameId.trim() : '';
  if (!gameId || gameId.length > 120) {
    return { error: 'gameId must be a non-empty string of at most 120 characters.' };
  }

  const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
  if (!title || title.length > 200) {
    return { error: 'title must be a non-empty string of at most 200 characters.' };
  }

  const sourceDocId =
    typeof payload?.sourceDocId === 'string' ? payload.sourceDocId.trim() : '';
  if (sourceDocId.length > 500) {
    return { error: 'sourceDocId is too long.' };
  }

  const rawQuestions = Array.isArray(payload?.questions) ? payload.questions : null;
  if (!rawQuestions || rawQuestions.length === 0) {
    return { error: 'At least one valid question is required.' };
  }
  if (rawQuestions.length > 2000) {
    return { error: 'A game bundle cannot contain more than 2000 questions.' };
  }

  const questions = [];
  const ids = new Set();
  for (const raw of rawQuestions) {
    const id = typeof raw?.id === 'string' ? raw.id.trim() : '';
    if (!id || id.length > 120) {
      return { error: 'Every question needs an id of at most 120 characters.' };
    }
    if (ids.has(id)) return { error: `Duplicate question id: ${id}.` };
    ids.add(id);

    const prompt = cleanQuestionPrompt(raw?.prompt);
    if (!prompt) {
      return { error: `Question ${id} needs a PL, FR or EN prompt.` };
    }

    const question = { id, prompt };
    if (raw?.level != null) {
      const level = typeof raw.level === 'string' ? raw.level.trim().toUpperCase() : '';
      if (!WIEDZY_LEVELS.includes(level)) {
        return { error: `Question ${id} has an invalid level.` };
      }
      question.level = level;
    }
    const answer = cleanQuestionAnswer(raw?.answer);
    if (answer) question.answer = answer;
    questions.push(question);
  }

  return {
    value: {
      gameType,
      gameId,
      title,
      sourceDocId: sourceDocId || null,
      questions,
    },
  };
}

// Active means a liveSyncState.game_results entry that started but has not
// completed. Accept the keyed game id, the entry's gameId or its gameType so a
// legacy/short key cannot bypass the guard.
export function isGameActive(liveState, { gameId, gameType } = {}) {
  const results = liveState?.game_results;
  if (!results || typeof results !== 'object' || Array.isArray(results)) return false;
  const expectedType = normalizeGameType(gameType);
  const ids = new Set([gameId, gameType].filter((value) => typeof value === 'string' && value));

  for (const [key, entry] of Object.entries(results)) {
    if (!entry || typeof entry !== 'object') continue;
    const entryGameId = typeof entry.gameId === 'string' ? entry.gameId : key;
    const entryType = normalizeGameType(entry.gameType);
    const matches =
      ids.has(key) ||
      ids.has(entryGameId) ||
      (expectedType != null && entryType === expectedType);
    if (matches && entry.startedAt && !entry.completedAt) return true;
  }
  return false;
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

// Question Docs keep the stable BRIDE/GROOM placeholders; the published
// cartridge stores the couple's first names so the answer never reads as a role.
function resolveAnswer(answer, brideName, groomName) {
  if (typeof answer !== 'string') return answer;
  const token = answer.trim().toUpperCase();
  if (token === 'BRIDE' && brideName) return brideName;
  if (token === 'GROOM' && groomName) return groomName;
  return answer;
}

// Admin publish helper: attach fetched Doc text to the matching question list.
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
      const questions = parseGameQuestionDoc(textDoc, list.gameType).map((question) => ({
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
