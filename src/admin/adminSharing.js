// Client-side helpers for the admin private-file sharing dialog (issue #981).

import { DRIVE_DOC_MIME_TYPE, isFolder } from '../lib/driveFolders';

export const DRIVE_JSON_MIME_TYPE = 'application/json';

export function isShareableSecretFile(file) {
  return (
    !isFolder(file) &&
    (file?.mimeType === DRIVE_DOC_MIME_TYPE || file?.mimeType === DRIVE_JSON_MIME_TYPE)
  );
}

export function validateShareEmail(value) {
  const email = typeof value === 'string' ? value.trim() : '';
  return Boolean(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isOwnerPermission(permission) {
  return permission?.role === 'owner';
}

export function permissionLabel(permission) {
  return (
    permission?.emailAddress ||
    permission?.displayName ||
    permission?.domain ||
    permission?.id ||
    'Unknown recipient'
  );
}

export function shareErrorMessage(error) {
  const code = error?.code ?? '';
  if (code === 'drive_share_not_app_created') {
    return 'Only Docs created by the Stage Deck service account can be shared.';
  }
  if (code === 'drive_share_outside_secrets') {
    return 'Only files under secrets/<weddingId>/ can be shared.';
  }
  if (code === 'drive_owner_permission') {
    return 'The file owner permission cannot be removed.';
  }
  if (code === 'drive_permission_denied' || error?.status === 403) {
    return 'Google Drive denied this sharing change. Check the service-account access.';
  }
  if (code === 'drive_file_not_found' || error?.status === 404) {
    return 'The file or permission no longer exists. Refresh and try again.';
  }
  return error?.message || 'Sharing request failed.';
}
