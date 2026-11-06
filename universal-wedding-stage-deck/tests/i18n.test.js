import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  formatTime,
  getLocale,
  loadLocale,
  normalizeLocale,
  pickLocalizedText,
  resolveContentLocale,
  resolveInitialLocale,
  saveLocale,
  setLocale,
  t,
  tp,
} from '../src/i18n/index.js';
import { driftLabel } from '../src/lib/driftEngine.js';
import { roleLabel } from '../src/lib/roles.js';
import LanguageToggle from '../src/components/LanguageToggle.jsx';
import SyncStatusBadge from '../src/components/SyncStatusBadge.jsx';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

function fakeDocument() {
  return { documentElement: { lang: 'en' } };
}

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #78 per-device i18n', () => {
  it('ships the same key set for every locale', () => {
    const keys = Object.keys(en).sort();
    expect(Object.keys(fr).sort()).toEqual(keys);
    expect(Object.keys(pl).sort()).toEqual(keys);
    for (const key of keys) {
      expect(en[key].trim()).not.toBe('');
      expect(fr[key].trim()).not.toBe('');
      expect(pl[key].trim()).not.toBe('');
    }
  });

  it('normalizes browser locale tags to supported base locales', () => {
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('fr_FR')).toBe('fr');
    expect(normalizeLocale('PL')).toBe('pl');
    expect(normalizeLocale('de-DE')).toBeNull();
    expect(normalizeLocale(null)).toBeNull();
  });

  it('persists the choice per device and only in localStorage', () => {
    const storage = fakeStorage();
    expect(loadLocale(storage)).toBeNull();
    expect(saveLocale('fr', storage)).toBe(true);
    expect(JSON.parse(storage.getItem(LOCALE_STORAGE_KEY))).toEqual({ locale: 'fr' });
    expect(loadLocale(storage)).toBe('fr');
  });

  it('uses the stored choice, then falls back to English', () => {
    const storage = fakeStorage();
    saveLocale('pl', storage);
    expect(resolveInitialLocale({ storage })).toBe('pl');
    expect(resolveInitialLocale({ storage: fakeStorage() })).toBe(DEFAULT_LOCALE);
  });

  it('updates <html lang> when the locale changes', () => {
    const doc = fakeDocument();
    setLocale('pl', { doc, persist: false });
    expect(doc.documentElement.lang).toBe('pl');
    setLocale('en', { doc, persist: false });
    expect(doc.documentElement.lang).toBe('en');
  });

  it('interpolates params and falls back to English for unknown locales', () => {
    setLocale('fr', { persist: false });
    expect(t('roles.role', { short: 'DJ' })).toBe('Rôle : DJ');
    setLocale('de', { persist: false });
    expect(getLocale()).toBe('fr');
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('uses locale-aware plural categories', () => {
    setLocale('en', { persist: false });
    expect(tp('status.failedAttempts', 1)).toBe('1 failed attempt');
    expect(tp('status.failedAttempts', 3)).toBe('3 failed attempts');

    setLocale('pl', { persist: false });
    expect(tp('status.failedAttempts', 1)).toBe('1 nieudana próba');
    expect(tp('status.failedAttempts', 3)).toBe('3 nieudane próby');
    expect(tp('status.failedAttempts', 5)).toBe('5 nieudanych prób');

    setLocale('fr', { persist: false });
    expect(tp('status.failedAttempts', 1)).toBe('1 tentative échouée');
    expect(tp('status.failedAttempts', 2)).toBe('2 tentatives échouées');
  });

  it('falls back from cartridge defaultContent to English', () => {
    expect(resolveContentLocale({ languages: { defaultContent: 'fr' } })).toBe('fr');
    expect(resolveContentLocale({ languages: { defaultContent: 'de' } })).toBe('en');
    expect(resolveContentLocale({})).toBe('en');
    expect(
      pickLocalizedText({ PL: 'Dziękujemy', EN: 'Thank you', FR: 'Merci' }, {
        locale: 'fr',
        contentLocale: 'pl',
      }),
    ).toBe('Merci');
    expect(
      pickLocalizedText({ PL: 'Dziękujemy', EN: 'Thank you' }, {
        locale: 'fr',
        contentLocale: 'PL',
      }),
    ).toBe('Dziękujemy');
  });

  it('localizes drift and role labels', () => {
    setLocale('fr', { persist: false });
    expect(driftLabel(0)).toBe("À L'HEURE");
    expect(driftLabel(25)).toBe('+25 min DE RETARD');
    expect(driftLabel(-5)).toBe("5 min D'AVANCE");
    expect(roleLabel('dj')).toBe('Cabine DJ');

    setLocale('pl', { persist: false });
    expect(driftLabel(0)).toBe('O CZASIE');
    expect(roleLabel('dj')).toBe('Kabina DJ-a');
  });

  it('formats times with the selected locale', () => {
    const value = new Date('2026-08-20T21:05:00Z');
    setLocale('en', { persist: false });
    expect(formatTime(value, { timeZone: 'UTC' })).toBe('21:05');
    setLocale('fr', { persist: false });
    expect(formatTime(value, { timeZone: 'UTC' })).toBe('21:05');
  });

  it('renders the language switch with the active locale selected', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LanguageToggle));
    expect(html).toContain('>EN<');
    expect(html).toContain('>FR<');
    expect(html).toContain('>PL<');
    expect(html).toMatch(/aria-checked="true"[^>]*>FR</);
  });

  it('renders status labels in the selected device language', () => {
    setLocale('fr', { persist: false });
    const french = renderToStaticMarkup(
      createElement(SyncStatusBadge, { status: 'connected' }),
    );
    expect(french).toContain('>Sync<');
    expect(french).toContain('Synchronisé');

    setLocale('en', { persist: false });
    const english = renderToStaticMarkup(
      createElement(SyncStatusBadge, { status: 'connected' }),
    );
    expect(english).toContain('>Sync<');
    expect(english).toContain('Cloud synced');
  });
});
