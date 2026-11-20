// Admin-only game question helpers (issue #933). These stay pure so the panel
// can be rendered and tested without Supabase. The cartridge remains the single
// source of enablement: admin never writes an independent game toggle.
import {
  GAME_TYPES,
  defaultGameId,
  defaultGameTitle,
  gameQuestionDocCreationAuthorization,
  gameTypeLabel,
  normalizeGameLanguages,
  normalizeGameType,
} from '../lib/gameQuestions.js';

export const ADMIN_GAME_TYPES = Object.freeze([
  GAME_TYPES.TEST_WIEDZY,
  GAME_TYPES.TEST_ZGODNOSCI,
]);

export const GAME_PARSE_PROGRESS = Object.freeze(['fetch', 'parse', 'validate', 'encrypt']);

function inferGameType(game) {
  const explicit = normalizeGameType(game?.gameType);
  if (explicit) return explicit;
  const key = `${game?.id ?? ''} ${game?.title ?? ''}`.toLowerCase();
  if (/wiedz/.test(key)) return GAME_TYPES.TEST_WIEDZY;
  if (/zgodn/.test(key)) return GAME_TYPES.TEST_ZGODNOSCI;
  return null;
}

function gameStepEntries(cartridge) {
  return (Array.isArray(cartridge?.steps) ? cartridge.steps : [])
    .map((step) => step?.game)
    .filter((game) => game && typeof game === 'object')
    .map((game) => ({ game, gameType: inferGameType(game) }))
    .filter((entry) => entry.gameType);
}

function legacyListEntries(cartridge) {
  const lists = Array.isArray(cartridge?.games?.questionLists)
    ? cartridge.games.questionLists
    : [];
  return lists
    .filter((list) => list && typeof list === 'object')
    .map((game) => ({ game, gameType: inferGameType(game) }))
    .filter((entry) => entry.gameType);
}

export function cartridgeGameLanguages(cartridge) {
  return normalizeGameLanguages(cartridge?.extensions?.languages?.supported);
}

// Per-step `game.enabled` wins. Legacy `games.enabled` / `games.questionLists`
// is only consulted when the cartridge has no matching game step.
export function resolveAdminGame(cartridge, gameType) {
  const type = normalizeGameType(gameType);
  if (!type) throw new Error('A game type is required.');
  const stepEntry = gameStepEntries(cartridge).find((entry) => entry.gameType === type) ?? null;
  const legacyEntry = legacyListEntries(cartridge).find((entry) => entry.gameType === type) ?? null;
  const game = stepEntry?.game ?? legacyEntry?.game ?? null;

  let enabled = false;
  let enablement = 'disabled';
  if (stepEntry) {
    enabled = stepEntry.game.enabled !== false;
    enablement = 'step';
  } else if (cartridge?.games?.enabled === true && legacyEntry) {
    enabled = legacyEntry.game.enabled !== false;
    enablement = 'legacy';
  }

  const languages = cartridgeGameLanguages(cartridge);
  const creation = gameQuestionDocCreationAuthorization(cartridge, type);
  return {
    gameType: type,
    label: gameTypeLabel(type),
    enabled,
    enablement,
    requested: creation.requested,
    creation,
    gameId: game?.id ?? defaultGameId(type),
    title: game?.title ?? defaultGameTitle(type),
    sourceDocId: game?.sourceDocId ?? null,
    languages: languages ?? [],
    languagesMissing: !languages || languages.length === 0,
  };
}

export function resolveAdminGames(cartridge) {
  return ADMIN_GAME_TYPES.map((gameType) => resolveAdminGame(cartridge, gameType));
}

function embeddedQuestions(game) {
  return Array.isArray(game?.questions) ? game.questions : [];
}

// Legacy migration alert counts (issue #933 only surfaces them; #935 performs
// the migration). Linked means the legacy set points at a Drive question Doc.
export function legacyGameMigration(cartridge, docs = []) {
  const docByType = new Map(
    (Array.isArray(docs) ? docs : [])
      .map((doc) => [normalizeGameType(doc?.game_type ?? doc?.gameType), doc])
      .filter(([type]) => type),
  );
  const entries = [];
  const seen = new Set();
  const add = (game, gameType) => {
    if (!gameType || seen.has(gameType)) return;
    const questions = embeddedQuestions(game);
    if (questions.length === 0) return;
    seen.add(gameType);
    const doc = docByType.get(gameType);
    const sourceDocId =
      typeof game?.sourceDocId === 'string' && game.sourceDocId.trim()
        ? game.sourceDocId.trim()
        : null;
    entries.push({
      gameType,
      label: gameTypeLabel(gameType),
      id: game?.id ?? defaultGameId(gameType),
      title: game?.title ?? defaultGameTitle(gameType),
      questionCount: questions.length,
      sourceDocId,
      linked: Boolean(sourceDocId || doc?.drive_doc_id),
    });
  };

  for (const entry of gameStepEntries(cartridge)) add(entry.game, entry.gameType);
  for (const entry of legacyListEntries(cartridge)) add(entry.game, entry.gameType);

  const linkedCount = entries.filter((entry) => entry.linked).length;
  const unlinked = entries.filter((entry) => !entry.linked);
  return {
    lists: entries,
    linkedCount,
    unlinkedCount: unlinked.length,
    questionCount: entries.reduce((total, entry) => total + entry.questionCount, 0),
    unlinkedQuestionCount: unlinked.reduce((total, entry) => total + entry.questionCount, 0),
    hasLegacy: entries.length > 0,
  };
}

// A Doc must be reviewed and re-parsed after the supported language list changes
// or after the server rebuilt its columns.
export function gameDocLanguageReview(doc, languages) {
  if (!doc) return null;
  const next = normalizeGameLanguages(languages) ?? [];
  const current = normalizeGameLanguages(doc.languages) ?? [];
  const languagesChanged = current.join('|') !== next.join('|');
  if (!doc.review_required && !languagesChanged) return null;
  return {
    required: true,
    reviewRequired: Boolean(doc.review_required),
    languagesChanged,
    docLanguages: current,
    languages: next,
    added: next.filter((code) => !current.includes(code)),
    removed: current.filter((code) => !next.includes(code)),
  };
}

export function resolveGameAnswer(question, cartridge) {
  const token = typeof question?.answer === 'string' ? question.answer.toUpperCase() : '';
  if (token !== 'BRIDE' && token !== 'GROOM') return question?.answer ?? null;
  const firstName = (key) => {
    const value = cartridge?.coupleProfile?.[key]?.firstName;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object') {
      return (
        [value.PL, value.EN, value.FR].find(
          (candidate) => typeof candidate === 'string' && candidate.trim(),
        ) ?? null
      );
    }
    return null;
  };
  const name = firstName(token === 'BRIDE' ? 'bride' : 'groom');
  return name ? { name, role: token } : token === 'BRIDE' ? 'Bride' : 'Groom';
}
