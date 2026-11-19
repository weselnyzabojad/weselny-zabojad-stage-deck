import { readFileSync } from 'node:fs';
import { createElement } from 'react';
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

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #1270 landing editorial brand ribbon', () => {
  it('renders the ribbon above the header for every locale', () => {
    for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
      setLocale(locale, { persist: false });
      const html = renderToStaticMarkup(createElement(LandingPage));
      const text = html.replaceAll('&amp;', '&');
      const ribbonIndex = html.indexOf('bg-[#FAF8F5]/90');
      const headerIndex = html.indexOf('<header');
      expect(ribbonIndex).toBeGreaterThan(-1);
      expect(headerIndex).toBeGreaterThan(-1);
      expect(ribbonIndex).toBeLessThan(headerIndex);
      expect(text).toContain(dictionary['landing.ribbon.prefix']);
      expect(text).toContain(dictionary['landing.ribbon.prefixShort']);
      expect(text).toContain(dictionary['landing.ribbon.descriptor']);
      expect(text).toContain(dictionary['landing.ribbon.link']);
      expect(text).toContain(dictionary['landing.ribbon.linkShort']);
      expect(text).toContain(dictionary['landing.ribbon.linkAria']);
    }
  });

  it('uses the main-site language helper for the external link', () => {
    for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
      setLocale(locale, { persist: false });
      const html = renderToStaticMarkup(createElement(LandingPage));
      expect(html).toContain(`href="${getMainSiteUrl(locale)}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain(`aria-label="${dictionary['landing.ribbon.linkAria']}"`);
    }
  });

  it('keeps the ribbon compact, single-line and non-sticky', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('w-full border-b border-[#EAE2D3]/70 bg-[#FAF8F5]/90');
    expect(landing).toContain('mx-auto flex min-h-9 w-full max-w-5xl items-center justify-between gap-3 px-4 py-2');
    expect(landing).toContain('flex min-w-0 items-center gap-2');
    expect(landing).toContain('min-w-0 truncate text-[11px] text-[#78716C] sm:text-xs');
    expect(landing).toContain('font-medium text-[#292524]');
    expect(landing).toContain('h-1.5 w-1.5 shrink-0 rounded-full bg-[#B89550]');
    expect(landing).toContain('whitespace-nowrap');
    expect(landing).toContain('h-3 w-3 shrink-0');
    expect(landing).not.toContain('sticky');
  });

  it('does not add the ribbon outside the landing page', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing.match(/<BrandRibbon \/>/g)).toHaveLength(1);
  });
});
