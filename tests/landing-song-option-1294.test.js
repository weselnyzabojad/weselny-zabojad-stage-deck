import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../src/components/LandingPage.jsx';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';
import { setLocale } from '../src/i18n/index.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const EXPECTED = {
  en: {
    badge: 'Exclusive option',
    condition: 'Exclusive to packages with our preferred partners',
  },
  fr: {
    badge: 'Option exclusive',
    condition: 'Exclusif aux formules de nos partenaires privilégiés',
  },
  pl: {
    badge: 'Opcja ekskluzywna',
    condition: 'Wyłącznie w pakietach z naszymi zaufanymi partnerami',
  },
};

const DICTIONARIES = { en, fr, pl };

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #1294 conditional song-request landing card', () => {
  it('defines the badge and condition copy in every locale', () => {
    for (const [locale, expected] of Object.entries(EXPECTED)) {
      expect(DICTIONARIES[locale]['landing.features.7.badge']).toBe(expected.badge);
      expect(DICTIONARIES[locale]['landing.features.7.condition']).toBe(expected.condition);
    }
  });

  it('renders the badge and bottom note once, in every locale', () => {
    for (const [locale, expected] of Object.entries(EXPECTED)) {
      setLocale(locale, { persist: false });
      const html = renderToStaticMarkup(createElement(LandingPage));
      expect(html.split(expected.badge)).toHaveLength(2);
      expect(html.split(expected.condition)).toHaveLength(2);
      expect(html).toContain(DICTIONARIES[locale]['landing.features.7.body']);
    }
  });

  it('adds the lock note only to the song-request card', () => {
    const html = renderToStaticMarkup(createElement(LandingPage));
    const noteSurface = 'rounded-xl border border-[#C5A059]/30 bg-white/70';
    expect(html.split(noteSurface)).toHaveLength(2);
  });

  it('keeps the standard cards on their existing surface', () => {
    const html = renderToStaticMarkup(createElement(LandingPage));
    expect(html.split('bg-white').length).toBeGreaterThan(1);
    expect(html).toContain('bg-[#FBF4E4]');
    expect(html).toContain('border-[#C5A059]/45');
  });

  it('keeps the badge clear of the icon and the note bottom-aligned', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('sm:grid-cols-2 lg:grid-cols-3');
    expect(landing).toContain('relative flex h-full flex-col');
    expect(landing).toContain('pt-12');
    expect(landing).toContain('absolute right-3 top-3');
    expect(landing).toContain('uppercase');
    expect(landing).toContain('mt-auto pt-5');
  });

  it('does not hardcode the new UI copy in the component', () => {
    const landing = read('src/components/LandingPage.jsx');
    for (const expected of Object.values(EXPECTED)) {
      expect(landing).not.toContain(expected.badge);
      expect(landing).not.toContain(expected.condition);
    }
    expect(landing).toContain("t('landing.features.7.badge')");
    expect(landing).toContain("t('landing.features.7.condition')");
  });
});
