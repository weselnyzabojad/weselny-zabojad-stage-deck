// Minimal local error log (project.md TODO 24).
//
// A render crash must never lose the only diagnostic. This module keeps a
// small, bounded log in localStorage so the host can inspect or copy it after
// the event. It never stores cartridge data, sensitive values or form values.

export const ERROR_LOG_STORAGE_KEY = 'wzsd:v1:error-log';
export const ERROR_LOG_LIMIT = 20;

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function firstLines(value, maxLines, maxLength) {
  return String(value ?? '')
    .split('\n')
    .slice(0, maxLines)
    .join('\n')
    .slice(0, maxLength);
}

export function makeErrorEntry({
  error,
  errorInfo,
  scope = 'app',
  role = null,
  weddingId = null,
  stepId = null,
  stepTitle = null,
} = {}) {
  const message =
    typeof error === 'string'
      ? error
      : error?.message ?? 'Unknown render error';

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    scope,
    role: role ?? null,
    weddingId: weddingId ?? null,
    stepId: stepId ?? null,
    stepTitle: stepTitle ?? null,
    message: String(message).slice(0, 500),
    stack: firstLines(error?.stack, 12, 2000),
    componentStack: firstLines(errorInfo?.componentStack, 12, 2000),
  };
}

export function loadErrorLog(storage) {
  const store = getStorage(storage);
  if (!store) return [];

  try {
    const raw = store.getItem(ERROR_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object') : [];
  } catch {
    return [];
  }
}

export function recordError(input, storage) {
  const store = getStorage(storage);
  const entry = makeErrorEntry(input);
  if (!store) return entry;

  try {
    const next = [entry, ...loadErrorLog(store)].slice(0, ERROR_LOG_LIMIT);
    store.setItem(ERROR_LOG_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the in-memory entry is still returned.
  }

  return entry;
}

export function clearErrorLog(storage) {
  const store = getStorage(storage);
  if (!store) return false;

  try {
    store.removeItem(ERROR_LOG_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function formatErrorLog(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) return 'No local errors logged.';

  return entries
    .map((entry, index) => {
      const header = `#${index + 1} ${entry.at ?? '—'} · ${entry.scope ?? 'app'}`;
      const context = [
        entry.role ? `role=${entry.role}` : null,
        entry.stepId ? `step=${entry.stepId}` : null,
        entry.stepTitle ? `title=${entry.stepTitle}` : null,
      ]
        .filter(Boolean)
        .join(' ');
      const lines = [
        header,
        context,
        `message: ${entry.message ?? '—'}`,
        entry.componentStack ? `componentStack:\n${entry.componentStack}` : null,
        entry.stack ? `stack:\n${entry.stack}` : null,
      ].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n\n');
}
