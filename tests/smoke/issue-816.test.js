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

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #816 landing header and provider-facing copy', () => {
  it('enlarges the landing header logo', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('className="h-14 w-auto object-contain sm:h-16"');
    expect(landing).toContain('alt="Weselny Żabojad"');
  });

  it('ships the validated provider-facing copy in every locale', () => {
    expect(fr['landing.hero.lead']).toContain('partagent le même planning en direct');
    expect(fr['landing.hero.lead']).not.toContain('réseau de la salle tombe');
    expect(fr['landing.mock.songs.caption']).toContain('sans application à télécharger');

    expect(pl['landing.hero.lead']).toContain('dzielą ten sam plan na żywo');
    expect(pl['landing.mock.songs.caption']).toContain('bez pobierania aplikacji');

    expect(en['landing.hero.lead']).toContain('share the same live schedule');
    expect(en['landing.mock.songs.caption']).toContain('with no app to download');
  });

  it('adds the intro copy above the hero in every locale', () => {
    for (const dictionary of [fr, pl, en]) {
      expect(dictionary['landing.intro.p1'].trim()).not.toBe('');
      expect(dictionary['landing.intro.p2'].trim()).not.toBe('');
    }

    expect(fr['landing.intro.p1']).toContain('mieux que de longs questionnaires impersonnels');
    expect(fr['landing.intro.p2']).toContain('De cette exigence est né le Stage Deck');

    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));
    const text = html.replace(/<[^>]+>/g, '');
    expect(text).toContain(fr['landing.intro.p1']);
    expect(text).toContain(fr['landing.intro.p2']);
    expect(text.indexOf(fr['landing.intro.p1'])).toBeLessThan(text.indexOf(fr['landing.hero.title']));
  });

  it('renders the included note as a prominent callout', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('rounded-xl border border-[#C5A059]/35 bg-[#C5A059]/10');
    expect(landing).toContain(
      'text-center text-sm font-semibold leading-relaxed text-[#1A1A1A] sm:whitespace-nowrap sm:text-base',
    );

    setLocale('pl', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));
    expect(html).toContain(pl['landing.hero.included']);
  });
});
