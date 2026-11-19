import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  parseLocaleParam,
  resolveEntryLocale,
} from '../src/lib/localeContinuity.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1272 incoming ?lang locale continuity', () => {
  it('parses valid lang values with i18n normalization', () => {
    expect(parseLocaleParam('?lang=fr')).toBe('fr');
    expect(parseLocaleParam('?lang=FR')).toBe('fr');
    expect(parseLocaleParam('?lang=fr-FR')).toBe('fr');
    expect(parseLocaleParam('?lang=pl_PL')).toBe('pl');
    expect(parseLocaleParam('?lang=en')).toBe('en');
    expect(parseLocaleParam('lang=fr')).toBe('fr');
    expect(parseLocaleParam('?foo=bar&lang=en')).toBe('en');
  });

  it('ignores absent, empty and unsupported values', () => {
    expect(parseLocaleParam('')).toBeNull();
    expect(parseLocaleParam()).toBeNull();
    expect(parseLocaleParam(null)).toBeNull();
    expect(parseLocaleParam('?lang=')).toBeNull();
    expect(parseLocaleParam('?lang=de')).toBeNull();
    expect(parseLocaleParam('?foo=bar')).toBeNull();
  });

  it('applies the URL parameter before the stored locale and fallback', () => {
    expect(resolveEntryLocale({ search: '?lang=fr', stored: 'pl', fallback: 'en' })).toBe('fr');
    expect(resolveEntryLocale({ search: '?lang=EN', stored: 'fr', fallback: 'pl' })).toBe('en');
  });

  it('falls back to the stored locale, then the per-route fallback', () => {
    expect(resolveEntryLocale({ search: '?lang=de', stored: 'fr', fallback: 'pl' })).toBe('fr');
    expect(resolveEntryLocale({ search: '', stored: 'en', fallback: 'pl' })).toBe('en');
    expect(resolveEntryLocale({ search: '', stored: null, fallback: 'fr' })).toBe('fr');
    expect(resolveEntryLocale({ search: '', stored: null, fallback: 'unknown' })).toBe('pl');
  });

  it('wires the helper into the landing and banner entry points', () => {
    for (const path of ['src/main.jsx', 'src/landing-main.jsx']) {
      const entry = read(path);
      expect(entry).toContain("import { resolveEntryLocale } from './lib/localeContinuity.js'");
      expect(entry).toContain('resolveEntryLocale({');
      expect(entry).toContain('loadLocale()');
    }

    const main = read('src/main.jsx');
    expect(main).toContain('if (IS_LANDING)');
    expect(main).toContain('if (IS_BANNER)');
    expect(main).toContain('if (EMBED_ROUTE)');
    expect(main).toContain('{ persist: false }');
    expect(main).not.toContain('EMBED_ROUTE.lang');
  });

  it('keeps deck and admin routes out of the ?lang path', () => {
    const main = read('src/main.jsx');
    const localeBlock = main.slice(
      main.indexOf('const LOCALE_SEARCH'),
      main.indexOf('const LEGACY_ADMIN'),
    );
    expect(localeBlock).toContain('if (IS_LANDING)');
    expect(localeBlock).toContain('if (IS_BANNER)');
    expect(localeBlock).toContain('if (EMBED_ROUTE)');
    expect(localeBlock).not.toContain('IS_ADMIN');
    expect(localeBlock).not.toContain('SONG_REQUEST_ROUTE');
    expect(localeBlock).not.toContain('RECAP_TOKEN');
  });
});
