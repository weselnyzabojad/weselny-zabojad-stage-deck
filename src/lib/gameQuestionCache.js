// Offline copy of the MC's decrypted game questions (issue #934).
//
// The cache is scoped to one wedding + game type, stores only decrypted
// question data (never the key), and expires with the role session. It is
// cleared on logout, revocation and wedding/session expiry.

const STORAGE_VERSION = 1;
const KEY_PREFIX = `wzsd:v${STORAGE_VERSION}:game-questions:`;

export function gameQuestionCacheKey(weddingId, gameType) {
  return `${KEY_PREFIX}${weddingId}:${gameType}`;
}

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function cleanQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.filter(
    (question) =>
      question &&
      typeof question === 'object' &&
      typeof question.id === 'string' &&
      question.id &&
      question.prompt &&
      typeof question.prompt === 'object' &&
      !Array.isArray(question.prompt),
  );
}

export function saveGameQuestions(
  { weddingId, gameType, gameId, title, revision, questions, expiresAt = null },
  storage,
) {
  const store = getStorage(storage);
  if (!store || !weddingId || !gameType || !Array.isArray(questions)) return false;
  try {
    store.setItem(
      gameQuestionCacheKey(weddingId, gameType),
      JSON.stringify({
        weddingId,
        gameType,
        gameId: gameId ?? null,
        title: title ?? null,
        revision: Number.isInteger(revision) ? revision : null,
        questions: cleanQuestions(questions),
        expiresAt,
        savedAt: new Date().toISOString(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function loadGameQuestions(
  weddingId,
  gameType,
  { storage, now = Date.now() } = {},
) {
  const store = getStorage(storage);
  if (!store || !weddingId || !gameType) return null;
  try {
    const raw = store.getItem(gameQuestionCacheKey(weddingId, gameType));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      parsed.weddingId !== weddingId ||
      parsed.gameType !== gameType ||
      !Array.isArray(parsed.questions)
    ) {
      return null;
    }
    if (parsed.expiresAt && Date.parse(parsed.expiresAt) <= now) {
      store.removeItem(gameQuestionCacheKey(weddingId, gameType));
      return null;
    }
    return {
      weddingId,
      gameType,
      gameId: typeof parsed.gameId === 'string' ? parsed.gameId : null,
      title: typeof parsed.title === 'string' ? parsed.title : null,
      revision: Number.isInteger(parsed.revision) ? parsed.revision : null,
      questions: cleanQuestions(parsed.questions),
      expiresAt: parsed.expiresAt ?? null,
    };
  } catch {
    return null;
  }
}

export function clearGameQuestions(weddingId, gameType, storage) {
  const store = getStorage(storage);
  if (!store || !weddingId || !gameType) return false;
  try {
    store.removeItem(gameQuestionCacheKey(weddingId, gameType));
    return true;
  } catch {
    return false;
  }
}

// Logout and revocation clear every decrypted game copy for this wedding.
export function clearGameQuestionsForWedding(weddingId, storage) {
  const store = getStorage(storage);
  if (!store || !weddingId) return 0;
  const prefix = `${KEY_PREFIX}${weddingId}:`;
  let removed = 0;
  try {
    const keys = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (typeof key === 'string' && key.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) {
      store.removeItem(key);
      removed += 1;
    }
  } catch {
    return removed;
  }
  return removed;
}
