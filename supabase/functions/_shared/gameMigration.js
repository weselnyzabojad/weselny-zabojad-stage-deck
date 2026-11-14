// Issue #935: pure helpers for the one-time legacy game question migration.
//
// The Edge Function reads and validates the Drive question Doc, then uses these
// helpers to plan the per-game action and to strip question text from the
// cartridge. Keeping the destructive transform pure makes retries and partial
// migrations testable without Deno or Google Drive.

import {
  defaultGameId,
  defaultGameTitle,
  gameTypeLabel,
  normalizeGameType,
} from './gameQuestions.js';

export const GAME_MIGRATION_TYPES = Object.freeze(['TEST_WIEDZY', 'TEST_ZGODNOSCI']);

const GAME_METADATA_FIELDS = [
  'id',
  'title',
  'gameType',
  'enabled',
  'requiresPhotographer',
  'sourceDocId',
  'status',
];

function inferGameType(game) {
  const explicit = normalizeGameType(game?.gameType);
  if (explicit) return explicit;
  const key = `${game?.id ?? ''} ${game?.title ?? ''}`.toLowerCase();
  if (/wiedz/.test(key)) return 'TEST_WIEDZY';
  if (/zgodn/.test(key)) return 'TEST_ZGODNOSCI';
  return null;
}

function embeddedQuestions(game) {
  return Array.isArray(game?.questions)
    ? game.questions.filter((question) => question && typeof question === 'object')
    : [];
}

function stepGameEntries(cartridge) {
  const entries = new Map();
  const steps = Array.isArray(cartridge?.steps) ? cartridge.steps : [];
  for (let index = 0; index < steps.length; index += 1) {
    const game = steps[index]?.game;
    if (!game || typeof game !== 'object' || Array.isArray(game)) continue;
    const gameType = inferGameType(game);
    if (gameType && !entries.has(gameType)) {
      entries.set(gameType, { game, stepIndex: index, step: steps[index] });
    }
  }
  return entries;
}

function legacyListEntries(cartridge) {
  const entries = new Map();
  const lists = Array.isArray(cartridge?.games?.questionLists)
    ? cartridge.games.questionLists
    : [];
  for (const game of lists) {
    if (!game || typeof game !== 'object' || Array.isArray(game)) continue;
    const gameType = inferGameType(game);
    if (gameType && !entries.has(gameType)) entries.set(gameType, { game });
  }
  return entries;
}

function metadataFor(game, gameType) {
  const metadata = {};
  for (const field of GAME_METADATA_FIELDS) {
    if (game?.[field] !== undefined) metadata[field] = game[field];
  }
  if (!metadata.id) metadata.id = defaultGameId(gameType);
  if (!metadata.title) metadata.title = defaultGameTitle(gameType);
  if (!metadata.gameType) metadata.gameType = gameType;
  return metadata;
}

// Lists every legacy game entry the wedding still carries. A step `game` wins
// over a `games.questionLists` row for the same type. Embedded questions from
// either source are counted once for that type.
export function collectLegacyGameEntries(cartridge) {
  const stepEntries = stepGameEntries(cartridge);
  const listEntries = legacyListEntries(cartridge);
  const types = [...new Set([...stepEntries.keys(), ...listEntries.keys()])];

  return types.map((gameType) => {
    const stepEntry = stepEntries.get(gameType) ?? null;
    const listEntry = listEntries.get(gameType) ?? null;
    const stepQuestions = stepEntry ? embeddedQuestions(stepEntry.game) : [];
    const listQuestions = listEntry ? embeddedQuestions(listEntry.game) : [];
    const questions = stepQuestions.length > 0 ? stepQuestions : listQuestions;
    const source = stepEntry?.game ?? listEntry?.game ?? {};
    const enabled = stepEntry
      ? stepEntry.game.enabled !== false
      : cartridge?.games?.enabled === true && listEntry?.game?.enabled !== false;

    return {
      gameType,
      label: gameTypeLabel(gameType),
      gameId:
        typeof source.id === 'string' && source.id.trim()
          ? source.id.trim()
          : defaultGameId(gameType),
      title:
        typeof source.title === 'string' && source.title.trim()
          ? source.title.trim()
          : defaultGameTitle(gameType),
      enabled,
      sourceDocId:
        typeof source.sourceDocId === 'string' && source.sourceDocId.trim()
          ? source.sourceDocId.trim()
          : null,
      hasStep: Boolean(stepEntry),
      hasLegacyList: Boolean(listEntry),
      embeddedQuestionCount: questions.length,
      questions,
    };
  });
}

// Removes every legacy question field and leaves only game metadata. Existing
// step metadata and enabled flags win; legacy `games.questionLists` rows are
// folded into their matching step before the obsolete `games` object is
// deleted. The live sync state (including game_results) is copied untouched.
export function stripLegacyGameQuestions(cartridge) {
  if (!cartridge || typeof cartridge !== 'object' || Array.isArray(cartridge)) {
    return cartridge;
  }

  const clean = JSON.parse(JSON.stringify(cartridge));
  const steps = Array.isArray(clean.steps) ? clean.steps : [];
  const lists = Array.isArray(clean.games?.questionLists)
    ? clean.games.questionLists
    : [];

  for (const list of lists) {
    if (!list || typeof list !== 'object' || Array.isArray(list)) continue;
    const gameType = inferGameType(list);
    if (!gameType) continue;
    const step =
      steps.find((entry) => entry?.gameId && entry.gameId === list.id) ??
      steps.find(
        (entry) =>
          typeof entry?.title === 'string' &&
          typeof list.title === 'string' &&
          entry.title.trim().toLowerCase() === list.title.trim().toLowerCase(),
      );
    if (!step) continue;
    step.game = step.game
      ? { ...metadataFor(list, gameType), ...step.game }
      : metadataFor(list, gameType);
    delete step.gameId;
    if (step.optionalFlag === 'games') delete step.optionalFlag;
  }

  for (const step of steps) {
    if (!step?.game || typeof step.game !== 'object') continue;
    delete step.game.questions;
  }
  delete clean.games;

  return clean;
}

// `checks` is produced by the Edge Function after reading the linked Drive Doc:
// { [gameType]: { readable, migratable, reason, code, questions, file } }.
// The returned plan is deliberately serializable and omits question text from
// the public summary built by the caller.
export function planGameMigration({
  cartridge,
  docs = [],
  bundles = [],
  checks = {},
  activeGameTypes = [],
}) {
  const entries = new Map(
    collectLegacyGameEntries(cartridge).map((entry) => [entry.gameType, entry]),
  );
  const docsByType = new Map(
    (Array.isArray(docs) ? docs : [])
      .map((doc) => [normalizeGameType(doc?.game_type ?? doc?.gameType), doc])
      .filter(([gameType]) => gameType),
  );
  const bundlesByType = new Map(
    (Array.isArray(bundles) ? bundles : [])
      .map((bundle) => [normalizeGameType(bundle?.game_type ?? bundle?.gameType), bundle])
      .filter(([gameType]) => gameType),
  );
  const active = new Set(
    (Array.isArray(activeGameTypes) ? activeGameTypes : [])
      .map((gameType) => normalizeGameType(gameType))
      .filter(Boolean),
  );

  const games = GAME_MIGRATION_TYPES.map((gameType) => {
    const entry = entries.get(gameType) ?? null;
    const doc = docsByType.get(gameType) ?? null;
    const bundle = bundlesByType.get(gameType) ?? null;
    const check = checks[gameType] ?? null;
    const embeddedQuestionCount = entry?.embeddedQuestionCount ?? 0;
    const bundleRevision =
      Number.isInteger(bundle?.live_revision) && bundle.live_revision > 0
        ? bundle.live_revision
        : null;
    const enabled = entry?.enabled ?? false;

    let action = 'none';
    let reason = null;
    if (bundleRevision != null) {
      action = 'already-migrated';
      reason = 'bundle-already-published';
    } else if (!enabled) {
      action = embeddedQuestionCount > 0 ? 'discard' : 'metadata';
      reason = embeddedQuestionCount > 0 ? 'game-disabled' : null;
    } else if (check?.migratable) {
      action = 'migrate';
    } else if (embeddedQuestionCount > 0) {
      action = 'discard';
      reason = check?.reason ?? 'no-readable-doc';
    }

    return {
      gameType,
      label: entry?.label ?? gameTypeLabel(gameType),
      gameId: entry?.gameId ?? doc?.game_id ?? defaultGameId(gameType),
      title: entry?.title ?? doc?.title ?? defaultGameTitle(gameType),
      enabled,
      sourceDocId:
        entry?.sourceDocId ??
        (typeof doc?.drive_doc_id === 'string' ? doc.drive_doc_id : null),
      hasLegacy: Boolean(entry && (entry.hasStep || entry.hasLegacyList)),
      hasEmbeddedQuestions: embeddedQuestionCount > 0,
      embeddedQuestionCount,
      linked: Boolean(entry?.sourceDocId || doc?.drive_doc_id),
      docReadable: Boolean(check?.readable),
      migratable: Boolean(check?.migratable),
      docCheck: check
        ? {
            readable: Boolean(check.readable),
            migratable: Boolean(check.migratable),
            reason: check.reason ?? null,
            code: check.code ?? null,
            errors: Array.isArray(check.errors) ? check.errors.slice(0, 20) : [],
            sourceDocId: check.sourceDocId ?? null,
            file: check.file ?? null,
          }
        : null,
      doc: doc
        ? {
            driveDocId: doc.drive_doc_id ?? null,
            driveDocName: doc.drive_doc_name ?? null,
            driveDocVersion: doc.drive_doc_version ?? null,
            driveFolderId: doc.drive_folder_id ?? null,
            status: doc.status ?? null,
          }
        : null,
      bundleRevision,
      bundleQuestionCount: Number.isInteger(bundle?.question_count)
        ? bundle.question_count
        : 0,
      action,
      reason,
      active: active.has(gameType),
      // Internal only. The caller removes this before returning the preflight.
      questions: check?.migratable && Array.isArray(check.questions) ? check.questions : [],
    };
  });

  const legacyListCount = Array.isArray(cartridge?.games?.questionLists)
    ? cartridge.games.questionLists.length
    : 0;
  // Question lists that are neither Test Wiedzy nor Test Zgodności cannot be
  // migrated. They still block a silent strip: the owner must confirm and the
  // discard is logged with no game type.
  const unknownLegacyLists = (Array.isArray(cartridge?.games?.questionLists)
    ? cartridge.games.questionLists
    : []
  )
    .filter((list) => !inferGameType(list))
    .map((list) => ({
      title: typeof list?.title === 'string' && list.title.trim() ? list.title.trim() : 'Game',
      questionCount: embeddedQuestions(list).length,
    }))
    .filter((list) => list.questionCount > 0);
  const unknownLegacyQuestionCount = unknownLegacyLists.reduce(
    (total, list) => total + list.questionCount,
    0,
  );
  const discarded = games.filter((game) => game.action === 'discard');
  const questionCount =
    games.reduce((total, game) => total + game.embeddedQuestionCount, 0) +
    unknownLegacyQuestionCount;

  return {
    games,
    unknownLegacyLists,
    unknownLegacyQuestionCount,
    hasLegacy: questionCount > 0 || legacyListCount > 0,
    questionCount,
    unlinkedQuestionCount:
      discarded.reduce((total, game) => total + game.embeddedQuestionCount, 0) +
      unknownLegacyQuestionCount,
    requiresConfirmation:
      discarded.some((game) => game.embeddedQuestionCount > 0) ||
      unknownLegacyQuestionCount > 0,
    migratedCount: games.filter((game) => game.action === 'migrate').length,
    discardedCount: discarded.length,
    blockedByActive: games
      .filter((game) => game.active && ['migrate', 'discard'].includes(game.action))
      .map((game) => game.gameType),
  };
}
