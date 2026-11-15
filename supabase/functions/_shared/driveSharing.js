// Private Drive sharing rules (issue #982). Pure helpers so Vitest can exercise
// ancestry checks and validation without Google or Deno.

import {
  DRIVE_DOC_MIME_TYPE,
  DRIVE_FOLDER_MIME_TYPE,
  DRIVE_JSON_MIME_TYPE,
} from './googleDrive.js';

export const SECRETS_FOLDER_NAME = 'secrets';
export const SHARE_ROLE = 'reader';
export const MAX_SHARE_MESSAGE_LENGTH = 200;
export const WEDDING_ID_PATTERN = /^(?:[A-Za-z0-9&]+-)?UM-\d{4}-\d{2}-\d{3}$/;

export function normalizeShareEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email || email.length > 254) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

export function sanitizeShareMessage(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_SHARE_MESSAGE_LENGTH) : '';
}

export function isShareableFile(file) {
  return (
    file?.mimeType === DRIVE_DOC_MIME_TYPE || file?.mimeType === DRIVE_JSON_MIME_TYPE
  );
}

export function isFolder(file) {
  return file?.mimeType === DRIVE_FOLDER_MIME_TYPE;
}

// A file is shareable only when it sits below `secrets/<weddingId>/`. The folder
// directly under `secrets` must be the wedding id, which keeps the private tree
// separate from the customer-visible `YYYY/Month/<weddingId>/` tree.
export async function resolveSecretsWeddingId({
  fileId,
  getFileMetadata,
  maxDepth = 6,
}) {
  let file;
  try {
    file = await getFileMetadata(fileId);
  } catch (error) {
    return {
      ok: false,
      status: error?.status ?? 404,
      code: error?.code ?? 'drive_file_not_found',
      error: error?.message ?? 'Drive file not found.',
    };
  }

  if (!file?.id) {
    return { ok: false, status: 404, code: 'drive_file_not_found', error: 'Drive file not found.' };
  }
  if (isFolder(file) || !isShareableFile(file)) {
    return {
      ok: false,
      status: 415,
      code: 'drive_unsupported_type',
      error: 'Only Google Docs and cartridge JSON files can be shared.',
    };
  }

  let child = file;
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const parentId = Array.isArray(child.parents) ? child.parents[0] : '';
    if (!parentId) break;
    let parent;
    try {
      parent = await getFileMetadata(parentId);
    } catch {
      break;
    }
    if (parent?.name === SECRETS_FOLDER_NAME && isFolder(parent)) {
      if (!WEDDING_ID_PATTERN.test(child.name ?? '')) {
        return {
          ok: false,
          status: 403,
          code: 'drive_share_outside_secrets',
          error: 'Only files under secrets/<weddingId>/ can be shared.',
        };
      }
      // Anchor `secrets` to a month-level ancestor so a same-named folder
      // elsewhere in Drive cannot satisfy the boundary.
      const monthId = Array.isArray(parent.parents) ? parent.parents[0] : '';
      if (!monthId) {
        return {
          ok: false,
          status: 403,
          code: 'drive_share_outside_secrets',
          error: 'The secrets folder is not under the wedding tree.',
        };
      }
      let month;
      try {
        month = await getFileMetadata(monthId);
      } catch {
        month = null;
      }
      if (!month?.id || !isFolder(month)) {
        return {
          ok: false,
          status: 403,
          code: 'drive_share_outside_secrets',
          error: 'The secrets folder is not under the wedding tree.',
        };
      }
      return { ok: true, weddingId: child.name, file };
    }
    child = parent;
  }

  return {
    ok: false,
    status: 403,
    code: 'drive_share_outside_secrets',
    error: 'Only files under secrets/<weddingId>/ can be shared.',
  };
}

export function findPermissionByEmail(permissions, email) {
  const target = normalizeShareEmail(email);
  if (!target) return null;
  return (
    (Array.isArray(permissions) ? permissions : []).find(
      (permission) =>
        permission?.type === 'user' &&
        String(permission?.emailAddress ?? '').toLowerCase() === target,
    ) ?? null
  );
}

export function isOwnerPermission(permission) {
  return permission?.role === 'owner';
}
