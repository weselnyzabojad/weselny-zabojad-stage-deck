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
const DICTIONARIES = { en, fr, pl };

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #1130 landing role coverage', () => {
  it('names musicians in the hero lead in every locale', () => {
    expect(en['landing.hero.lead']).toContain('the musicians');
    expect(fr['landing.hero.lead']).toContain('les musiciens');
    expect(pl['landing.hero.lead']).toContain('muzycy');
  });

  it('names musicians in the role mock caption in every locale', () => {
    expect(en['landing.mock.role.caption']).toContain('musicians');
    expect(fr['landing.mock.role.caption']).toContain('musiciens');
    expect(pl['landing.mock.role.caption']).toContain('muzycy');
  });

  it('renders the musician role chip and updated copy in all three locales', () => {
    for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
      setLocale(locale, { persist: false });
      const html = renderToStaticMarkup(createElement(LandingPage));
      expect(html).toContain(dictionary['landing.hero.lead']);
      expect(html).toContain(dictionary['landing.mock.role.caption']);
      expect(html).toContain('MUSICIAN');
    }
  });

  it('does not advertise the combined DJ + MC role', () => {
    const landing = read('src/components/LandingPage.jsx');
    const copy = Object.entries(DICTIONARIES)
      .flatMap(([, dictionary]) =>
        Object.entries(dictionary)
          .filter(([key]) => key.startsWith('landing.'))
          .map(([, value]) => value),
      )
      .join(' ');
    expect(landing).not.toMatch(/DJ\s*\+\s*MC/i);
    expect(copy).not.toMatch(/DJ\s*\+\s*MC/i);
  });

  it('keeps the role mock horizontally safe on narrow cards', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('flex flex-wrap gap-1.5');
  });
});
