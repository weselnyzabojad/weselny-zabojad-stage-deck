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

describe('issue #811 deck-focused landing', () => {
  it('ships every deck landing string in all three locales', () => {
    const keys = Object.keys(en).filter((key) => key.startsWith('landing.'));
    expect(keys.length).toBeGreaterThan(45);
    for (const dictionary of [fr, pl]) {
      for (const key of keys) {
        expect(dictionary[key]).toBeTruthy();
        expect(dictionary[key].trim()).not.toBe('');
      }
    }
  });

  it('renders a 100% deck product page for couples', () => {
    setLocale('pl', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain('Całe wesele w jednym rytmie');
    expect(html).toContain('Porozmawiajmy o Waszym projekcie');
    expect(html).toContain('Stage Deck jest dołączony bez dodatkowych kosztów');
    expect(html).toContain('Jeden wspólny harmonogram');
    expect(html).toContain('Działa bez zasięgu');
    expect(html).toContain('Zmiany na żywo');
    expect(html).toContain('Widoki dopasowane do roli');
    expect(html).toContain('Prywatność przede wszystkim');
    expect(html).toContain('Jak aplikacja na telefonie');
    expect(html).toContain('Prośby o piosenki');
    expect(html).toContain('Jeden wspólny plan');
    expect(html).toContain('Widok dla każdej roli');
    expect(html).toContain(`href="${contactHref(pl['landing.contact.prefill'])}"`);
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('removes the service sales positioning', () => {
    const landing = read('src/components/LandingPage.jsx');
    const landingStrings = Object.entries(pl)
      .filter(([key]) => key.startsWith('landing.'))
      .map(([, value]) => value)
      .join(' ');

    expect(landing).not.toMatch(/MC\/DJ|doświadczenie od 2019|Sprawdź dostępność/i);
    expect(landingStrings).not.toMatch(/MC\/DJ|doświadczenie od 2019|Sprawdź dostępność/i);
    expect(landing).not.toMatch(/cennik|\bprice|pricing|pakiet|package/i);
    expect(landing).not.toMatch(/tel:|wa\.me|mailto:|calendly|cal\.com/i);
  });

  it('describes song requests as conditional in every locale', () => {
    expect(pl['landing.features.7.body']).toMatch(/formuły/i);
    expect(en['landing.features.7.body']).toMatch(/package/i);
    expect(fr['landing.features.7.body']).toMatch(/formule/i);
    expect(pl['landing.faq.2.a']).toMatch(/konto nie jest wymagane/i);
    expect(en['landing.faq.2.a']).toMatch(/No account is required/i);
    expect(fr['landing.faq.2.a']).toMatch(/aucun compte n’est requis/i);
  });

  it('keeps the Stage Deck brand and attribution', () => {
    expect(pl['landing.footer.note']).toContain('Stage Deck');
    expect(pl['landing.footer.note']).toContain('Weselny Żabojad');
    expect(en['landing.footer.note']).toContain('Stage Deck');
  });

  it('uses no real wedding data, demo module or third-party tracking', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).not.toContain('@demo');
    expect(landing).not.toContain('demoWedding');
    expect(landing).not.toContain('supabase');
    expect(landing).not.toMatch(/coupleProfile|bride|groom|Jennifer|Guillaume/);
    expect(landing).not.toMatch(/gtag|analytics|pixel|facebook\.net|hotjar/i);
    expect(landing).toContain("const CONTACT_BASE = 'https://www.weselnyzabojad.pl/';");
    expect((landing.match(/https:\/\/www\.weselnyzabojad\.pl\//g) ?? []).length).toBe(1);
  });
});
