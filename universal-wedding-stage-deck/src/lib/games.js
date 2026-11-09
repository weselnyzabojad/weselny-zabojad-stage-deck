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
  if (wedding?.games?.enabled !== true) return [];
  const lists = Array.isArray(wedding?.games?.questionLists)
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
