import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../../src/components/LandingPage.jsx';
import en from '../../src/i18n/en.js';
import fr from '../../src/i18n/fr.js';
import pl from '../../src/i18n/pl.js';
import { setLocale } from '../../src/i18n/index.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

const CONTACT_URL = 'https://www.weselnyzabojad.pl/#kontakt';

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #806 customer-facing service landing', () => {
  it('ships every landing string in all three locales', () => {
    const keys = Object.keys(en).filter((key) => key.startsWith('landing.'));
    expect(keys.length).toBeGreaterThan(50);
    for (const dictionary of [fr, pl]) {
      for (const key of keys) {
        expect(dictionary[key]).toBeTruthy();
        expect(dictionary[key].trim()).not.toBe('');
      }
    }
  });

  it('renders the Polish sales page with the single contact CTA', () => {
    setLocale('pl', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain('Wasze wesele poprowadzone w trzech językach');
    expect(html).toContain('Sprawdź dostępność');
    expect(html).toContain(`href="${CONTACT_URL}"`);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('/join');
    expect(html).toContain('Wasza ekipa weselna działa w jednym rytmie');
    expect(html).toContain('Najczęstsze pytania');
  });

  it('has no packages, prices, analytics or extra contact channels', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).not.toMatch(/tel:|wa\.me|mailto:|calendly|cal\.com/i);
    expect(landing).not.toMatch(/\bprice|pricing|cennik|pakiet|package\b/i);
    expect(landing).not.toMatch(/gtag|analytics|pixel|facebook\.net|hotjar/i);
    expect(landing).not.toMatch(/https?:\/\/(?!www\.weselnyzabojad\.pl)/);
    expect((landing.match(/https:\/\/www\.weselnyzabojad\.pl\/#kontakt/g) ?? []).length).toBe(1);
  });

  it('uses the locale toggle and defaults the landing to Polish', () => {
    const landing = read('src/components/LandingPage.jsx');
    const main = read('src/main.jsx');
    expect(landing).toContain('LanguageToggle');
    expect(landing).toContain("variant=\"desktop\"");
    expect(main).toContain("if (IS_LANDING && !loadLocale()) setLocale('pl')");
  });

  it('keeps real wedding data, demo data and third-party assets out', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).not.toContain('@demo');
    expect(landing).not.toContain('demoWedding');
    expect(landing).not.toContain('supabase');
    expect(landing).not.toContain('cartridge');
    expect(landing).not.toMatch(/coupleProfile|bride|groom|Jennifer|Guillaume/);
    expect(landing).toContain("from '../assets/img/logo.png'");
  });
});
