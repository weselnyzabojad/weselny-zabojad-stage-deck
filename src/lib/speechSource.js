// Google Docs link handling for speech scripts (issue #598).
//
// Admins paste a Docs/Drive link; the Drive API needs the file id, not the URL.

const DOC_URL = /docs\.google\.com\/document\/d\/([A-Za-z0-9_-]+)/;
const FILE_URL = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/;
const ID_QUERY = /[?&]id=([A-Za-z0-9_-]+)/;
const RAW_ID = /^[A-Za-z0-9_-]{10,}$/;

export function parseDriveFileId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (RAW_ID.test(raw) && !raw.includes('/')) return raw;
  for (const pattern of [DOC_URL, FILE_URL, ID_QUERY]) {
    const match = raw.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function buildSourceDoc(file, { url = null, retrievedAt = null } = {}) {
  if (!file?.id) return null;
  return {
    provider: 'GOOGLE_DRIVE',
    fileId: file.id,
    url: url ?? `https://docs.google.com/document/d/${file.id}/edit`,
    ...(file.name ? { name: file.name } : {}),
    ...(file.mimeType ? { mimeType: file.mimeType } : {}),
    ...(file.version ? { version: file.version } : {}),
    ...(file.modifiedTime ? { modifiedTime: file.modifiedTime } : {}),
    ...(retrievedAt ? { retrievedAt } : {}),
  };
}

export function sourceDocChanged(current, file) {
  if (!current || !file) return true;
  if (file.version && current.version) return current.version !== file.version;
  if (file.modifiedTime && current.modifiedTime) {
    return current.modifiedTime !== file.modifiedTime;
  }
  return true;
}
