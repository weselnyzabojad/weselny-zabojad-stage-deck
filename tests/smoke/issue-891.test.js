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

function contactHref(prefill) {
  const url = new URL('https://www.weselnyzabojad.pl/');
  url.searchParams.set('prefill', prefill);
  url.hash = 'kontakt';
  return url.toString();
}

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #891 landing contact prefill', () => {
  it('ships the exact localized attestation', () => {
    expect(fr['landing.contact.prefill']).toBe(
      'Je vous contacte depuis la page d’accueil Stage Deck (weselnyzabojad.pl).',
    );
    expect(pl['landing.contact.prefill']).toBe(
      'Kontaktuję się ze strony głównej Stage Deck (weselnyzabojad.pl).',
    );
    expect(en['landing.contact.prefill']).toBe(
      "I'm contacting you from the Stage Deck landing page (weselnyzabojad.pl).",
    );
  });

  it('builds the same prefilled href from the active locale for both CTAs', () => {
    for (const [locale, dictionary] of Object.entries({ en, fr, pl })) {
      setLocale(locale, { persist: false });
      const html = renderToStaticMarkup(createElement(LandingPage));
      const href = contactHref(dictionary['landing.contact.prefill']);

      expect(html.split(`href="${href}"`)).toHaveLength(3);
      expect(href.endsWith('#kontakt')).toBe(true);
      const decoded = new URL(href).searchParams.get('prefill');
      expect(decoded).toBe(dictionary['landing.contact.prefill']);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    }
  });

  it('uses the URL API and keeps no client-side tracking', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('new URL(CONTACT_BASE)');
    expect(landing).toContain("url.searchParams.set('prefill'");
    expect(landing).toContain("url.hash = 'kontakt'");
    expect(landing).not.toMatch(/analytics|gtag|pixel|localStorage|sessionStorage/i);
  });
});
