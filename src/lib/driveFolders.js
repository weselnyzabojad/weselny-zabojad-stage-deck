export const DRIVE_ROOT_FOLDER_ID = '1Q7IVT0GNiLztKQE8l4eCDCRw-px1qheh';

export const DRIVE_YEAR_FALLBACKS = [
  { id: '145xqCF3A6OnYpFztCPMYZ-WJKNnZB3W4', name: '2027' },
  { id: '1sG5k17XD1do7UmKmPzQS-BDfZMrKe6mT', name: '2028' },
];

export const DRIVE_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_KEYS = new Set(DRIVE_MONTH_NAMES.map((month) => month.toLowerCase()));
export const WEDDING_FOLDER_PATTERN = /^UM-\d{4}-\d{2}-\d{3}$/i;
export const DRIVE_DOC_MIME_TYPE = 'application/vnd.google-apps.document';

export function isFolder(file) {
  return file?.mimeType === 'application/vnd.google-apps.folder';
}

export function isYearFolder(file) {
  return isFolder(file) && /^\d{4}$/.test(String(file?.name ?? '').trim());
}

export function isMonthFolder(file) {
  return isFolder(file) && MONTH_KEYS.has(String(file?.name ?? '').trim().toLowerCase());
}

export function isSecretsFolder(file) {
  return isFolder(file) && String(file?.name ?? '').trim().toLowerCase() === 'secrets';
}

export function parseWeddingFolderName(name) {
  const value = String(name ?? '').trim();
  if (!WEDDING_FOLDER_PATTERN.test(value)) return null;
  const [, year, month, sequence] = value.toUpperCase().match(/^UM-(\d{4})-(\d{2})-(\d{3})$/);
  return { name: value.toUpperCase(), year, month, sequence, cartridgeName: value.toUpperCase() };
}

export function mergeYearFolders(files = []) {
  const byName = new Map();
  for (const file of files.filter(isYearFolder)) {
    byName.set(file.name, { id: file.id, name: file.name });
  }
  for (const fallback of DRIVE_YEAR_FALLBACKS) {
    if (!byName.has(fallback.name)) byName.set(fallback.name, fallback);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function partitionMonthFolders(files = []) {
  const monthFiles = files.filter(isMonthFolder);
  const secrets = files.find(isSecretsFolder) ?? null;
  const weddings = files
    .filter((file) => isFolder(file) && parseWeddingFolderName(file.name))
    .map((file) => ({
      ...file,
      wedding: parseWeddingFolderName(file.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { months: monthFiles, secrets, weddings };
}

// Stable manifest hash for refresh/diff decisions. Includes ids, names, Drive
// versions and modified times; order is normalized so page order does not matter.
export function manifestHash(files = []) {
  const manifest = files
    .map((file) => [
      String(file?.id ?? ''),
      String(file?.name ?? ''),
      String(file?.version ?? ''),
      String(file?.modifiedTime ?? ''),
    ].join('\u0001'))
    .sort()
    .join('\u0002');
  let hash = 2166136261;
  for (let index = 0; index < manifest.length; index += 1) {
    hash ^= manifest.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
