import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import WeddingRecapPage from '../src/components/WeddingRecapPage.jsx';
import { parseRecapToken } from '../src/lib/publicRoutes.js';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';
import { setLocale } from '../src/i18n/index.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #1137 couple-facing wedding recap', () => {
  it('parses private recap paths and rejects malformed tokens', () => {
    const token = 'a'.repeat(43);
    expect(parseRecapToken(`/recap/${token}`)).toBe(token);
    expect(parseRecapToken(`/deck/recap/${token}`, '/deck/')).toBe(token);
    expect(parseRecapToken('/recap/short')).toBeNull();
    expect(parseRecapToken(`/recap/${'a'.repeat(129)}`)).toBeNull();
    expect(parseRecapToken('/')).toBeNull();
  });

  it('routes the recap before the stage deck and not through landing', () => {
    const main = read('src/main.jsx');
    expect(main).toContain('parseRecapToken');
    expect(main).toContain('WeddingRecapPage');
    expect(main).toContain('RECAP_TOKEN');
    expect(main).toContain('<WeddingRecapPage token={RECAP_TOKEN} />');
    expect(main).toContain('IS_LANDING || RECAP_TOKEN ? null');
  });

  it('renders the localized loading state', () => {
    const token = 'a'.repeat(43);
    for (const [locale, dictionary] of Object.entries({ en, fr, pl })) {
      setLocale(locale, { persist: false });
      const html = renderToStaticMarkup(
        createElement(WeddingRecapPage, { token }),
      );
      expect(html).toContain(dictionary['recap.loading']);
    }
  });

  it('ships every recap string in en, fr and pl', () => {
    const keys = Object.keys(en).filter((key) => key.startsWith('recap.'));
    expect(keys.length).toBeGreaterThan(35);
    for (const dictionary of [fr, pl]) {
      for (const key of keys) {
        expect(dictionary[key], key).toBeTruthy();
        expect(dictionary[key].trim()).not.toBe('');
      }
    }
  });

  it('renders all safe sections, print controls and a noindex state', () => {
    const page = read('src/components/WeddingRecapPage.jsx');
    for (const section of [
      'recap.numbers.title',
      'recap.timeline.title',
      'recap.changes.title',
      'recap.music.title',
      'recap.games.title',
      'recap.ceremony.title',
      'recap.vendors.title',
    ]) {
      expect(page).toContain(section);
    }
    const summary = read('src/components/ClientExecutiveSummaryView.jsx');
    expect(summary).toContain("t('recap.print')");
    expect(summary).toContain('print:hidden');
    expect(page).toContain('window.print()');
    expect(page).toContain('noindex, nofollow');
    expect(page).toContain("meta.setAttribute('name', 'robots')");
    expect(page).not.toContain('mutation_log');
  });

  it('keeps both unavailable and error states safe', () => {
    const page = read('src/components/WeddingRecapPage.jsx');
    expect(page).toContain("t('recap.unavailable.title')");
    expect(page).toContain("t('recap.unavailable.body')");
    expect(page).toContain("t('recap.error.title')");
    expect(page).toContain("t('recap.retry')");
    expect(page).toContain("response.status === 404 || response.status === 410");
  });
});
