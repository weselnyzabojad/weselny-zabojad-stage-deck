import {
  defaultGameId,
  defaultGameTitle,
  normalizeGameLanguages,
  normalizeGameType,
} from './gameQuestions.js';

const GAME_TYPE_ORDER = ['TEST_WIEDZY', 'TEST_ZGODNOSCI'];

function localized(value, locale = 'PL') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    for (const key of [locale, 'PL', 'EN', 'FR']) {
      if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
    }
  }
  return null;
}

export function resolveGameQuestionLists(wedding, locale = 'PL') {
  const stepLists = (Array.isArray(wedding?.steps) ? wedding.steps : [])
    .map((step) => step?.game)
    .filter((game) => game && typeof game === 'object' && game.enabled !== false);
  const lists =
    stepLists.length > 0
      ? stepLists
      : wedding?.games?.enabled === true && Array.isArray(wedding?.games?.questionLists)
        ? wedding.games.questionLists
        : [];

  return lists
    .filter((list) => list && typeof list === 'object' && list.id && list.title)
    .map((list) => {
      const status = list.status ?? 'AVAILABLE';
      const questions = Array.isArray(list.questions)
        ? list.questions
            .filter((question) => question && question.id)
            .map((question) => ({
              id: question.id,
              prompt: localized(question.prompt, locale),
              ...(question.level ? { level: question.level } : {}),
              ...(question.answer ? { answer: question.answer } : {}),
            }))
            .filter((question) => question.prompt)
        : [];
      return {
        id: list.id,
        title: list.title,
        gameType: list.gameType ?? inferGameType(list),
        enabled: list.enabled !== false,
        sourceDocId: list.sourceDocId ?? null,
        status,
        unavailable: status !== 'AVAILABLE' || questions.length === 0,
        questions,
      };
    });
}

function inferGameType(list) {
  const key = `${list?.id ?? ''} ${list?.title ?? ''}`.toLowerCase();
  if (/wiedz/.test(key)) return 'TEST_WIEDZY';
  if (/zgodn/.test(key)) return 'TEST_ZGODNOSCI';
  return 'OTHER';
}

function coupleNames(wedding, locale) {
  const bride = localized(wedding?.coupleProfile?.bride?.firstName, locale) ?? 'Bride';
  const groom = localized(wedding?.coupleProfile?.groom?.firstName, locale) ?? 'Groom';
  return { bride, groom };
}

// Converts the cartridge question list into the existing clicker shape.
export function buildGameClicker(wedding, gameId, locale = 'PL') {
  const list = resolveGameQuestionLists(wedding, locale).find((entry) => entry.id === gameId);
  if (!list) return null;
  const names = coupleNames(wedding, locale);
  return {
    id: list.id,
    title: list.title,
    gameType: list.gameType,
    unavailable: list.unavailable,
    items: list.questions.map((question) => {
      let answer = null;
      if (question.answer === 'GROOM') answer = names.groom;
      else if (question.answer === 'BRIDE') answer = names.bride;
      else answer = localized(question.answer, locale);
      return {
        id: question.id,
        question: question.prompt,
        ...(question.level ? { level: question.level } : {}),
        answer,
      };
    }),
  };
}

export function gamesAvailable(wedding) {
  return resolveGameQuestionLists(wedding).some(
    (list) => !list.unavailable && list.questions.length > 0,
  );
}

// Ordered ISO 639-1 codes used for every question prompt (issue #930/#934).
export function resolveGameLanguages(wedding) {
  return normalizeGameLanguages(wedding?.extensions?.languages?.hostLanguages) ?? [];
}

// The explicit gameType wins; legacy cartridges without it are inferred from
// the stable game id/title. Non-game blocks resolve to null.
export function resolveGameType(game) {
  const explicit = normalizeGameType(game?.gameType);
  if (explicit) return explicit;
  if (!game || typeof game !== 'object') return null;
  const inferred = inferGameType(game);
  return inferred === 'OTHER' ? null : inferred;
}

// Which games this cartridge enables for the MC. Enablement stays cartridge
// metadata; the questions themselves come from the encrypted bundle.
export function enabledCartridgeGames(wedding) {
  const found = new Map();
  const add = (gameType, game) => {
    const type = resolveGameType({ ...game, gameType });
    if (!type || found.has(type) || game?.enabled === false) return;
    found.set(type, {
      gameType: type,
      gameId: typeof game?.id === 'string' && game.id ? game.id : defaultGameId(type),
      title:
        typeof game?.title === 'string' && game.title
          ? game.title
          : defaultGameTitle(type),
    });
  };

  for (const step of Array.isArray(wedding?.steps) ? wedding.steps : []) {
    add(step?.game?.gameType, step?.game);
  }
  if (wedding?.games?.enabled === true && Array.isArray(wedding?.games?.questionLists)) {
    for (const game of wedding.games.questionLists) add(game?.gameType, game);
  }

  return GAME_TYPE_ORDER.filter((type) => found.has(type)).map((type) => found.get(type));
}

function promptEntries(prompt, languages) {
  const entries = [];
  for (const language of languages) {
    const text = typeof prompt?.[language] === 'string' ? prompt[language].trim() : '';
    if (text) entries.push({ language, text });
  }
  return entries;
}

// Converts one decrypted bundle record into the clicker shape. Every supported
// language is returned in configured order; the overlay renders them together.
export function buildGameClickerFromBundle({
  game,
  wedding,
  locale = 'PL',
  languages = resolveGameLanguages(wedding),
}) {
  if (!game) return null;
  const codes = Array.isArray(languages) ? languages : [];
  const names = coupleNames(wedding, codes[0] ?? locale);
  const questions = Array.isArray(game.questions) ? game.questions : [];
  const items = questions
    .filter((question) => question && typeof question.id === 'string' && question.id)
    .map((question) => {
      let answer = null;
      if (question.answer === 'GROOM') answer = names.groom;
      else if (question.answer === 'BRIDE') answer = names.bride;
      else answer = localized(question.answer, locale);

      return {
        id: question.id,
        prompts: promptEntries(question.prompt, codes),
        question: localized(question.prompt, locale),
        ...(question.level ? { level: question.level } : {}),
        answer,
      };
    })
    .filter((item) => item.prompts.length > 0);

  return {
    id: game.gameId ?? game.id ?? null,
    title: game.title ?? null,
    gameType: normalizeGameType(game.gameType),
    languages: codes,
    loading: game.loading === true,
    unavailable:
      game.unavailable === true ||
      game.status === 'unavailable' ||
      game.status === 'revoked' ||
      (game.loading !== true && items.length === 0),
    items,
  };
}

// Persisted start marker for the existing liveSyncState.game_results session.
// The backend blocks publish/restore/delete while startedAt is set and
// completedAt is still empty.
export function startGameResult({ game, startedAt = new Date().toISOString() }) {
  if (!game?.id) return null;
  return {
    gameId: game.id,
    startedAt,
    updatedAt: startedAt,
    completedAt: null,
    totalQuestions: game.items?.length ?? 0,
    answeredCount: 0,
    questions: {},
  };
}

export const GAME_LEVELS = ['EASY', 'MEDIUM', 'HARD'];

export function orderGameItems(items = [], gameType = 'OTHER') {
  if (gameType !== 'TEST_WIEDZY') return [...items];
  return [...items].sort(
    (a, b) => GAME_LEVELS.indexOf(a.level) - GAME_LEVELS.indexOf(b.level),
  );
}

export function unansweredItems(items = [], answered = {}) {
  return items.filter((item) => !answered[item.id]);
}

export function gameCounters(items = [], answered = {}) {
  const answeredCount = items.filter((item) => answered[item.id]).length;
  return {
    total: items.length,
    answered: answeredCount,
    remaining: items.length - answeredCount,
    currentNumber: Math.min(answeredCount + 1, items.length || 1),
  };
}

export function buildGameResultsExport({ weddingId = null, game = null, result = null } = {}) {
  return {
    weddingId,
    gameId: result?.gameId ?? game?.id ?? null,
    title: game?.title ?? null,
    gameType: game?.gameType ?? null,
    startedAt: result?.startedAt ?? null,
    updatedAt: result?.updatedAt ?? null,
    completedAt: result?.completedAt ?? null,
    totalQuestions: result?.totalQuestions ?? game?.items?.length ?? 0,
    answeredCount: result?.answeredCount ?? 0,
    ...(typeof result?.score === 'number' ? { score: result.score } : {}),
    questions: result?.questions ?? {},
  };
}
