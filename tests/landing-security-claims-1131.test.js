import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../src/components/LandingPage.jsx';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';
import { setLocale } from '../src/i18n/index.js';

const DICTIONARIES = { en, fr, pl };
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const FORBIDDEN = /100\s*%|unhackable|zero[- ]risk|certified|audited|GDPR|RODO/i;

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #1131 landing security claim cleanup', () => {
  it('removes absolute security guarantees from every landing string', () => {
    for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
      for (const [key, value] of Object.entries(dictionary)) {
        if (!key.startsWith('landing.') || typeof value !== 'string') continue;
        expect(value, `${locale} ${key}`).not.toMatch(FORBIDDEN);
      }
    }
  });

  it('keeps the softened privacy statement in every locale', () => {
    expect(en['landing.features.5.body']).toContain('Privacy by design');
    expect(en['landing.features.5.body']).toContain('role-based access');
    expect(fr['landing.features.5.body']).toContain('Confidentialité par conception');
    expect(fr['landing.features.5.body']).toContain('accès par rôle');
    expect(pl['landing.features.5.body']).toContain('Prywatność od podstaw');
    expect(pl['landing.features.5.body']).toContain('dostępem opartym na rolach');

    expect(en['landing.faq.4.a']).toContain('each contributor can access only');
    expect(fr['landing.faq.4.a']).toContain('chaque intervenant');
    expect(pl['landing.faq.4.a']).toContain('każdy uczestnik');
  });

  it('renders the softened copy with the security structure intact', () => {
    for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
      setLocale(locale, { persist: false });
      const html = renderToStaticMarkup(createElement(LandingPage));
      expect(html).toContain(dictionary['landing.features.5.body']);
      expect(html).toContain(dictionary['landing.faq.4.a']);
      expect(html).toContain('id="landing-security"');
      expect(html).toContain(dictionary['landing.security.technical.title']);
      expect(html).not.toMatch(FORBIDDEN);
    }
  });

  it('records the landing privacy claim in the evidence map', () => {
    const claims = read('docs/security-claims.md');
    expect(claims).toContain('Landing privacy card and FAQ');
    expect(claims).toContain('Role-scoped JWTs + RLS');
    expect(claims).toContain('Do not publish');
  });
});
