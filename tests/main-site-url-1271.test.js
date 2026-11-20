import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../src/components/LandingPage.jsx';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';
import { setLocale } from '../src/i18n/index.js';
import { getMainSiteUrl } from '../src/lib/mainSite.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const DICTIONARIES = { en, fr, pl };
const PL_ROOT = 'https://www.weselnyzabojad.pl/';
const FR_ROOT = 'https://www.weselnyzabojad.pl/fr/home-fr/';

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #1271 main-site language URL helper', () => {
  it('maps PL, FR and EN to the published main-site pages', () => {
    expect(getMainSiteUrl('pl')).toBe(PL_ROOT);
    expect(getMainSiteUrl('fr')).toBe(FR_ROOT);
    expect(getMainSiteUrl('en')).toBe(PL_ROOT);
  });

  it('falls back to the PL root for absent or unsupported locales', () => {
    expect(getMainSiteUrl()).toBe(PL_ROOT);
    expect(getMainSiteUrl(null)).toBe(PL_ROOT);
    expect(getMainSiteUrl('')).toBe(PL_ROOT);
    expect(getMainSiteUrl('de')).toBe(PL_ROOT);
    expect(getMainSiteUrl('xx-YY')).toBe(PL_ROOT);
  });

  it('normalizes case and region tags like the i18n locale helper', () => {
    expect(getMainSiteUrl('FR')).toBe(FR_ROOT);
    expect(getMainSiteUrl('fr-FR')).toBe(FR_ROOT);
    expect(getMainSiteUrl('pl_PL')).toBe(PL_ROOT);
    expect(getMainSiteUrl('en_US')).toBe(PL_ROOT);
  });

  it('keeps the landing contact CTA on the PL contact page in every locale', () => {
    for (const locale of Object.keys(DICTIONARIES)) {
      setLocale(locale, { persist: false });
      const html = renderToStaticMarkup(createElement(LandingPage));
      const match = html.match(/href="(https:\/\/www\.weselnyzabojad\.pl\/\?prefill=[^"]+)"/);
      expect(match).not.toBeNull();
      const url = new URL(match[1].replaceAll('&amp;', '&'));
      expect(`${url.origin}${url.pathname}`).toBe(PL_ROOT);
      expect(url.hash).toBe('#kontakt');
      expect(url.searchParams.get('prefill')).toBe(
        DICTIONARIES[locale]['landing.contact.prefill'],
      );
    }
  });

  it('removes the local main-site base constant from the landing', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain("import { getMainSiteUrl } from '../lib/mainSite.js'");
    expect(landing).not.toContain('CONTACT_BASE');
    expect(landing).not.toContain('https://www.weselnyzabojad.pl');
  });
});
