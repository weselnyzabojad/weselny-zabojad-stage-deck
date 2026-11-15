// Issue #969: owner-triggered migration of existing speech and game question
// Docs to the UM wedding id and private Drive layout.
//
// The module is pure orchestration over the Google Drive connector so Vitest can
// exercise preflight, conflicts and partial retries with an in-memory Drive. It
// never reads Doc content: only metadata, folder names and file ids are used.
import { WEDDING_ID_PATTERN } from './adminPublish.js';
import { DRIVE_FOLDER_MIME_TYPE } from './googleDrive.js';
import {
  gameQuestionDocFileName,
  gameQuestionDocFolderPath,
  normalizeGameType,
} from './gameQuestions.js';
import { speechDocFilename } from './speechDoc.js';

export const DOC_MIGRATION_STATUSES = Object.freeze({
  READY: 'ready',
  RENAME: 'rename',
  MOVE: 'move',
  ALREADY_MIGRATED: 'already-migrated',
  TARGET_CONFLICT: 'target-conflict',
  MISSING_FILE_ID: 'missing-file-id',
  MISSING_FILE: 'missing-file',
  MISSING_WEDDING_FOLDER: 'missing-wedding-folder',
  WRONG_FOLDER: 'wrong-folder',
  INVALID_WEDDING_ID: 'invalid-wedding-id',
  INVALID_RECORD: 'invalid-record',
  MIGRATED: 'migrated',
  FAILED: 'failed',
});

const ACTIONABLE = new Set([
  DOC_MIGRATION_STATUSES.READY,
  DOC_MIGRATION_STATUSES.RENAME,
  DOC_MIGRATION_STATUSES.MOVE,
]);

export function isUmWeddingId(value) {
  return typeof value === 'string' && WEDDING_ID_PATTERN.test(value.trim());
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function speechMigrationTarget(weddingId, speech) {
  const id = clean(weddingId);
  if (!id) throw new Error('A wedding id is required.');
  const order = Number(speech?.sort_order ?? speech?.order);
  const speakerName = clean(speech?.speaker_name ?? speech?.speakerName);
  const relationship = clean(speech?.speaker_relationship ?? speech?.relationship);
  const segments = ['secrets', id, 'speeches'];
  return {
    kind: 'speech',
    name: speechDocFilename({ weddingId: id, order, speakerName, relationship }),
    scope: 'private',
    segments,
    displayPath: segments,
  };
}

export function gameMigrationTarget(weddingId, doc) {
  const id = clean(weddingId);
  if (!id) throw new Error('A wedding id is required.');
  const gameType = normalizeGameType(doc?.game_type ?? doc?.gameType);
  if (!gameType) throw new Error('A game type is required.');
  const path = gameQuestionDocFolderPath(gameType, id);
  return {
    kind: 'game',
    gameType,
    name: gameQuestionDocFileName(gameType, id),
    scope: path.scope,
    segments: path.segments,
    displayPath:
      path.scope === 'private' ? path.segments : [id, ...path.segments],
  };
}

// Walk from a Doc's parent up to the month folder. A Doc outside that subtree
// (another wedding, a shared drive, the Drive root) is reported as wrong-folder
// and is never moved.
export async function resolveFolderTrail({
  folderId,
  rootFolderId,
  getFileMetadata,
  maxDepth = 12,
}) {
  const start = clean(folderId);
  const root = clean(rootFolderId);
  if (!start || !root) return { underRoot: false, folderIds: [], names: [] };

  let current = start;
  const folderIds = [];
  const names = [];
  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (current === root) return { underRoot: true, folderIds, names };
    let folder;
    try {
      folder = await getFileMetadata(current);
    } catch {
      return { underRoot: false, folderIds, names };
    }
    if (folder?.mimeType !== DRIVE_FOLDER_MIME_TYPE) {
      return { underRoot: false, folderIds, names };
    }
    folderIds.unshift(current);
    names.unshift(folder.name);
    current = Array.isArray(folder.parents) ? folder.parents[0] : null;
    if (!current) break;
  }
  return { underRoot: false, folderIds, names };
}

// Existing folders are reused; this helper never creates anything. `segments`
// are relative to `scope`: the month root for private paths, the wedding folder
// otherwise.
export async function findMigrationFolderPath({ rootFolderId, segments, connector }) {
  let parent = clean(rootFolderId);
  if (!parent) return null;
  for (const segment of Array.isArray(segments) ? segments : []) {
    if (!parent) return null;
    const { files } = await connector.listChildren({ parentId: parent, name: segment });
    const folder = files.find((entry) => entry.mimeType === DRIVE_FOLDER_MIME_TYPE) ?? files[0];
    if (!folder?.id) return null;
    parent = folder.id;
  }
  return parent || null;
}

export function evaluateDocMigration({
  weddingIdValid,
  weddingFolderId,
  file,
  target,
  targetFolderId = null,
  conflictFileId = null,
  trail = null,
}) {
  if (!weddingIdValid) return { status: DOC_MIGRATION_STATUSES.INVALID_WEDDING_ID, feasible: false };
  if (!file) return { status: DOC_MIGRATION_STATUSES.MISSING_FILE, feasible: false };
  if (!clean(weddingFolderId)) {
    return { status: DOC_MIGRATION_STATUSES.MISSING_WEDDING_FOLDER, feasible: false };
  }
  if (!trail?.underRoot) return { status: DOC_MIGRATION_STATUSES.WRONG_FOLDER, feasible: false };
  if (conflictFileId && conflictFileId !== file.id) {
    return { status: DOC_MIGRATION_STATUSES.TARGET_CONFLICT, feasible: false };
  }

  const parentId = Array.isArray(file.parents) ? file.parents[0] ?? null : null;
  const atFolder = Boolean(targetFolderId && parentId === targetFolderId);
  const atName = file.name === target.name;
  if (atFolder && atName) {
    return { status: DOC_MIGRATION_STATUSES.ALREADY_MIGRATED, feasible: true };
  }
  if (atFolder) return { status: DOC_MIGRATION_STATUSES.RENAME, feasible: true };
  if (atName) return { status: DOC_MIGRATION_STATUSES.MOVE, feasible: true };
  return { status: DOC_MIGRATION_STATUSES.READY, feasible: true };
}

function entryBase(kind, record, target) {
  return {
    kind,
    id: kind === 'speech' ? clean(record?.id) : clean(record?.game_type ?? record?.gameType),
    gameType:
      kind === 'game' ? normalizeGameType(record?.game_type ?? record?.gameType) : null,
    fileId: clean(record?.drive_doc_id),
    target,
  };
}

function countEntries(entries) {
  const counts = {
    total: entries.length,
    ready: 0,
    alreadyMigrated: 0,
    conflicts: 0,
    missingFiles: 0,
    wrongFolders: 0,
    invalidWeddingId: 0,
    missingWeddingFolder: 0,
    invalidRecords: 0,
  };
  for (const entry of entries) {
    switch (entry.status) {
      case DOC_MIGRATION_STATUSES.READY:
      case DOC_MIGRATION_STATUSES.RENAME:
      case DOC_MIGRATION_STATUSES.MOVE:
        counts.ready += 1;
        break;
      case DOC_MIGRATION_STATUSES.ALREADY_MIGRATED:
        counts.alreadyMigrated += 1;
        break;
      case DOC_MIGRATION_STATUSES.TARGET_CONFLICT:
        counts.conflicts += 1;
        break;
      case DOC_MIGRATION_STATUSES.MISSING_FILE:
      case DOC_MIGRATION_STATUSES.MISSING_FILE_ID:
        counts.missingFiles += 1;
        break;
      case DOC_MIGRATION_STATUSES.WRONG_FOLDER:
        counts.wrongFolders += 1;
        break;
      case DOC_MIGRATION_STATUSES.INVALID_WEDDING_ID:
        counts.invalidWeddingId += 1;
        break;
      case DOC_MIGRATION_STATUSES.MISSING_WEDDING_FOLDER:
        counts.missingWeddingFolder += 1;
        break;
      default:
        counts.invalidRecords += 1;
    }
  }
  return counts;
}

async function inspectRecord({
  kind,
  record,
  weddingId,
  weddingIdValid,
  weddingFolderId,
  monthFolderId,
  connector,
}) {
  const base = entryBase(kind, record, null);
  if (!weddingIdValid) {
    return {
      ...base,
      status: DOC_MIGRATION_STATUSES.INVALID_WEDDING_ID,
      feasible: false,
      code: 'invalid_wedding_id',
    };
  }

  let target = null;
  let targetError = null;
  try {
    target =
      kind === 'speech'
        ? speechMigrationTarget(weddingId, record)
        : gameMigrationTarget(weddingId, record);
  } catch (error) {
    targetError = error?.message ?? 'The document record is invalid.';
  }
  base.target = target;
  if (!target) {
    return {
      ...base,
      status: DOC_MIGRATION_STATUSES.INVALID_RECORD,
      feasible: false,
      code: 'invalid_record',
      message: targetError,
    };
  }
  if (!base.fileId) {
    return {
      ...base,
      status: DOC_MIGRATION_STATUSES.MISSING_FILE_ID,
      feasible: false,
      code: 'missing_file_id',
    };
  }

  let file = null;
  let readError = null;
  try {
    file = await connector.getFileMetadata(base.fileId);
  } catch (error) {
    readError = error?.code ?? 'unreadable_doc';
  }
  if (!file) {
    return {
      ...base,
      status: DOC_MIGRATION_STATUSES.MISSING_FILE,
      feasible: false,
      code: readError ?? 'missing_file',
    };
  }
  if (!weddingFolderId || !monthFolderId) {
    const evaluation = evaluateDocMigration({
      weddingIdValid,
      weddingFolderId,
      file,
      target,
    });
    return {
      ...base,
      file,
      status: evaluation.status,
      feasible: evaluation.feasible,
      code: evaluation.status,
      current: {
        name: file.name,
        folderId: Array.isArray(file.parents) ? file.parents[0] ?? null : null,
        folderNames: [],
      },
    };
  }

  const currentFolderId = Array.isArray(file.parents) ? file.parents[0] ?? null : null;
  const trail = await resolveFolderTrail({
    folderId: currentFolderId,
    rootFolderId: monthFolderId,
    getFileMetadata: (id) => connector.getFileMetadata(id),
  });

  let targetFolderId = null;
  let conflictFileId = null;
  if (trail.underRoot) {
    const root =
      target.scope === 'private' ? monthFolderId : weddingFolderId;
    targetFolderId = await findMigrationFolderPath({
      rootFolderId: root,
      segments: target.segments,
      connector,
    });
    if (targetFolderId) {
      const existing = await connector.listChildren({
        parentId: targetFolderId,
        name: target.name,
        mimeType: null,
      });
      conflictFileId = existing.files[0]?.id ?? null;
    }
  }

  const evaluation = evaluateDocMigration({
    weddingIdValid,
    weddingFolderId,
    file,
    target,
    targetFolderId,
    conflictFileId,
    trail,
  });
  return {
    ...base,
    file,
    status: evaluation.status,
    feasible: evaluation.feasible,
    code: evaluation.status === DOC_MIGRATION_STATUSES.TARGET_CONFLICT
      ? 'target_conflict'
      : evaluation.status,
    targetFolderId,
    current: {
      name: file.name,
      folderId: currentFolderId,
      folderNames: trail.names,
      folderPath: trail.names,
    },
  };
}

export async function buildDocMigrationPlan({
  weddingId,
  weddingFolderId,
  speeches = [],
  gameDocs = [],
  connector,
}) {
  const id = clean(weddingId);
  const weddingIdValid = isUmWeddingId(id);
  const folderId = clean(weddingFolderId);
  let monthFolderId = null;
  let monthPath = [];
  if (folderId) {
    try {
      monthFolderId = await connector.resolveMonthFolderId(folderId);
    } catch {
      monthFolderId = null;
    }
  }
  if (monthFolderId) {
    try {
      const month = await connector.getFileMetadata(monthFolderId);
      monthPath = [month.name];
      const yearId = Array.isArray(month.parents) ? month.parents[0] : null;
      if (yearId) {
        const year = await connector.getFileMetadata(yearId);
        monthPath = [year.name, month.name];
      }
    } catch {
      monthPath = [];
    }
  }

  const entries = [];
  for (const speech of Array.isArray(speeches) ? speeches : []) {
    entries.push(
      await inspectRecord({
        kind: 'speech',
        record: speech,
        weddingId: id,
        weddingIdValid,
        weddingFolderId: folderId,
        monthFolderId,
        connector,
      }),
    );
  }
  for (const doc of Array.isArray(gameDocs) ? gameDocs : []) {
    entries.push(
      await inspectRecord({
        kind: 'game',
        record: doc,
        weddingId: id,
        weddingIdValid,
        weddingFolderId: folderId,
        monthFolderId,
        connector,
      }),
    );
  }

  return {
    weddingId: id,
    weddingIdValid,
    weddingFolderId: folderId || null,
    monthFolderId,
    monthPath,
    entries,
    counts: countEntries(entries),
  };
}

const SKIPPED = new Set([
  DOC_MIGRATION_STATUSES.INVALID_WEDDING_ID,
  DOC_MIGRATION_STATUSES.MISSING_FILE_ID,
  DOC_MIGRATION_STATUSES.MISSING_FILE,
  DOC_MIGRATION_STATUSES.MISSING_WEDDING_FOLDER,
  DOC_MIGRATION_STATUSES.WRONG_FOLDER,
  DOC_MIGRATION_STATUSES.INVALID_RECORD,
  DOC_MIGRATION_STATUSES.TARGET_CONFLICT,
  DOC_MIGRATION_STATUSES.ALREADY_MIGRATED,
]);

// Apply a preflight plan. Every entry is independent so a missing file or a
// conflict never blocks the remaining Docs and a partial run can be retried.
export async function executeDocMigration({ plan, connector }) {
  const results = [];
  const summary = {
    migrated: 0,
    renamed: 0,
    moved: 0,
    skipped: 0,
    conflicts: 0,
    failed: 0,
  };

  for (const entry of plan.entries) {
    const base = {
      kind: entry.kind,
      id: entry.id,
      gameType: entry.gameType,
      fileId: entry.fileId,
      target: entry.target,
    };
    if (SKIPPED.has(entry.status)) {
      if (entry.status === DOC_MIGRATION_STATUSES.TARGET_CONFLICT) summary.conflicts += 1;
      else summary.skipped += 1;
      results.push({
        ...base,
        status: entry.status,
        code: entry.code ?? entry.status,
        file: entry.file ?? null,
        folderId: entry.targetFolderId ?? null,
      });
      continue;
    }
    if (!ACTIONABLE.has(entry.status)) {
      summary.skipped += 1;
      results.push({ ...base, status: entry.status, code: entry.code ?? entry.status });
      continue;
    }

    try {
      const folder = await connector.ensureFolderPath({
        weddingFolderId: plan.weddingFolderId,
        segments: entry.target.segments,
        scope: entry.target.scope,
      });
      const existing = await connector.listChildren({
        parentId: folder.folder.id,
        name: entry.target.name,
        mimeType: null,
      });
      const clash = existing.files.find((file) => file.id !== entry.fileId);
      if (clash) {
        summary.conflicts += 1;
        results.push({
          ...base,
          status: DOC_MIGRATION_STATUSES.TARGET_CONFLICT,
          code: 'target_conflict',
          targetFolderId: folder.folder.id,
        });
        continue;
      }

      let file = entry.file;
      const actions = [];
      const parents = Array.isArray(file?.parents) ? file.parents : [];
      if (!parents.includes(folder.folder.id)) {
        file = await connector.moveFile({
          fileId: entry.fileId,
          parentId: folder.folder.id,
          removeParents: parents,
        });
        actions.push('move');
        summary.moved += 1;
      }
      if (file.name !== entry.target.name) {
        file = await connector.renameFile({ fileId: entry.fileId, name: entry.target.name });
        actions.push('rename');
        summary.renamed += 1;
      }
      summary.migrated += 1;
      results.push({
        ...base,
        status: DOC_MIGRATION_STATUSES.MIGRATED,
        code: null,
        file,
        folderId: folder.folder.id,
        actions,
      });
    } catch (error) {
      summary.failed += 1;
      results.push({
        ...base,
        status: DOC_MIGRATION_STATUSES.FAILED,
        code: typeof error?.code === 'string' ? error.code : 'migration_failed',
      });
    }
  }

  return { results, summary };
}
