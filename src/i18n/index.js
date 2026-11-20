// Per-device UI localization (issue #78).
//
// The UI language is a device preference: it is persisted in localStorage and
// never written to the synced live-state payload. Cartridge content keeps its
// own language; `resolveContentLocale()` reads `languages.defaultContent` with
// an English fallback for older cartridges.
import en from './en.js';
import fr from './fr.js';
import pl from './pl.js';

export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'fr', 'pl'];
export const LOCALE_STORAGE_KEY = 'wzsd:v1:locale';

const DICTIONARIES = { en, fr, pl };

let currentLocale = null;
const listeners = new Set();

function defaultStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isSupportedLocale(value) {
  return SUPPORTED_LOCALES.includes(value);
}

// Accepts `en`, `en-US`, `fr_FR`, `PL`, etc. Returns a supported base locale or
// null. Never throws.
export function normalizeLocale(value) {
  if (typeof value !== 'string') return null;
  const base = value.trim().toLowerCase().replaceAll('_', '-').split('-')[0];
  return isSupportedLocale(base) ? base : null;
}

export function loadLocale(storage = null) {
  const store = storage ?? defaultStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(LOCALE_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return normalizeLocale(parsed?.locale ?? parsed);
    } catch {
      // Tolerate a plain string written by an older build.
      return normalizeLocale(raw);
    }
  } catch {
    return null;
  }
}

export function saveLocale(locale, storage = null) {
  const next = normalizeLocale(locale);
  if (!next) return false;
  const store = storage ?? defaultStorage();
  if (!store) return false;
  try {
    store.setItem(LOCALE_STORAGE_KEY, JSON.stringify({ locale: next }));
    return true;
  } catch {
    return false;
  }
}

export function clearLocale(storage = null) {
  const store = storage ?? defaultStorage();
  if (!store) return false;
  try {
    store.removeItem(LOCALE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

// Stored choice wins; otherwise English. The default is deterministic so a
// French or Polish OS does not silently change the stage UI until the operator
// picks a language with the device toggle. This is device-local and never reads
// the cartridge.
export function resolveInitialLocale({ storage = null } = {}) {
  return loadLocale(storage) ?? DEFAULT_LOCALE;
}

export function applyDocumentLang(locale, doc = null) {
  const target = doc ?? (typeof document === 'undefined' ? null : document);
  if (!target?.documentElement) return;
  target.documentElement.lang = normalizeLocale(locale) ?? DEFAULT_LOCALE;
}

function ensureLocale() {
  if (!currentLocale) {
    currentLocale = resolveInitialLocale();
    applyDocumentLang(currentLocale);
  }
  return currentLocale;
}

export function getLocale() {
  return ensureLocale();
}

export function setLocale(locale, { storage = null, doc = null, persist = true } = {}) {
  const next = normalizeLocale(locale);
  if (!next) return getLocale();

  const changed = next !== currentLocale;
  currentLocale = next;
  applyDocumentLang(next, doc);
  if (persist) saveLocale(next, storage);

  if (changed) {
    for (const listener of listeners) listener();
  }
  return next;
}

export function subscribeLocale(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params[name];
    return value == null ? match : String(value);
  });
}

export function t(key, params) {
  if (typeof key !== 'string' || !key) return '';
  const locale = getLocale();
  const dictionary = DICTIONARIES[locale] ?? en;
  const template = dictionary[key] ?? en[key];
  if (typeof template !== 'string') return key;
  return interpolate(template, params);
}

// Plural-aware lookup: `tp('status.failedAttempts', 3)` uses the locale's
// Intl.PluralRules category (one/few/many/other) with an `other` fallback.
export function tp(key, count, params = {}) {
  const value = Number.isFinite(Number(count)) ? Number(count) : 0;
  const locale = getLocale();
  let category = value === 1 ? 'one' : 'other';
  try {
    category = new Intl.PluralRules(locale).select(value);
  } catch {
    // Older runtimes: the one/other fallback above is enough.
  }

  const dictionary = DICTIONARIES[locale] ?? en;
  const candidates = [`${key}.${category}`, `${key}.other`, `${key}.one`];
  for (const candidate of candidates) {
    const template = dictionary[candidate] ?? en[candidate];
    if (typeof template === 'string') {
      return interpolate(template, { count: value, ...params });
    }
  }
  return key;
}

function validTimeZone(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

export function formatTime(value, { seconds = false, timeZone = null, locale = null } = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  const zone = validTimeZone(timeZone);
  return new Intl.DateTimeFormat(locale ?? getLocale(), {
    ...(zone ? { timeZone: zone } : {}),
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
  }).format(date);
}

export function formatDate(value, { dateStyle = 'medium', locale = null } = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale ?? getLocale(), { dateStyle }).format(date);
}

// Event date with a localized weekday, used by the unified top-bar center.
export function formatWeekdayDate(value, { locale = null } = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale ?? getLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat(getLocale(), options).format(value);
}

// Backward-compatible content fallback: cartridge `languages.defaultContent`,
// then English. Older v1.1 cartridges have no such field and intentionally
// keep their authored content language.
export function resolveContentLocale(wedding) {
  const candidate =
    wedding?.languages?.defaultContent ?? wedding?.languages?.default ?? null;
  return normalizeLocale(candidate) ?? DEFAULT_LOCALE;
}

// Pick a string from a schema `localizedText` map. The UI locale wins, then the
// cartridge default content language, then English, then the first value.
export function pickLocalizedText(value, { locale = null, contentLocale = null } = {}) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';

  const ui = normalizeLocale(locale ?? getLocale());
  const content = normalizeLocale(contentLocale);
  const order = [ui, content, 'en', ...Object.keys(value)];

  for (const code of order) {
    if (!code) continue;
    const direct = value[code] ?? value[String(code).toUpperCase()];
    if (typeof direct === 'string' && direct.trim()) return direct;
  }
  return '';
}
