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

  it('ships the corrected provider-facing copy in every locale', () => {
    expect(fr['landing.hero.eyebrow']).toBe('À disposition des prestataires, pour les futurs mariés');
    expect(fr['landing.hero.lead']).toBe(
      'Le maître de cérémonie, le DJ, le photographe, le vidéaste, le manager de la salle et tout autre prestataire voient la même timeline en direct — même quand le réseau de la salle tombe.',
    );
    expect(fr['landing.mock.songs.caption']).toBe(
      'Les invités envoient leurs demandes depuis leur téléphone — soumis à certaines conditions.',
    );

    expect(pl['landing.hero.eyebrow']).toBe('Do dyspozycji usługodawców, dla przyszłych nowożeńców');
    expect(pl['landing.hero.lead']).toContain(
      'operator wideo, manager sali i każdy inny usługodawca',
    );
    expect(pl['landing.mock.songs.caption']).toBe(
      'Goście wysyłają prośby z telefonu — z zastrzeżeniem określonych warunków.',
    );

    expect(en['landing.hero.eyebrow']).toBe('Available to wedding vendors, for future newlyweds');
    expect(en['landing.hero.lead']).toContain(
      'videographer, venue manager and any other vendor',
    );
    expect(en['landing.mock.songs.caption']).toBe(
      'Guests send requests from their phone — subject to certain conditions.',
    );
  });

  it('adds the intro copy above the hero in every locale', () => {
    for (const dictionary of [fr, pl, en]) {
      expect(dictionary['landing.intro.p1'].trim()).not.toBe('');
      expect(dictionary['landing.intro.p2'].trim()).not.toBe('');
    }

    expect(fr['landing.intro.p1']).toContain('Parce qu’un mariage mérite mieux');
    expect(fr['landing.intro.p2']).toContain('De cette approche est né le Stage Deck');

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
