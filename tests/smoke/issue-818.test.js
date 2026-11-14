import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../../src/components/LandingPage.jsx';
import en from '../../src/i18n/en.js';
import fr from '../../src/i18n/fr.js';
import pl from '../../src/i18n/pl.js';
import { setLocale } from '../../src/i18n/index.js';

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #818 landing intro and contact CTA copy', () => {
  it('ships the harmonised intro copy in every locale', () => {
    expect(fr['landing.intro.p1']).toContain('questionnaires impersonnels');
    expect(fr['landing.intro.p2']).toContain('De cette exigence est né le Stage Deck');
    expect(fr['landing.intro.p2']).toContain('savourer chaque instant');

    expect(pl['landing.intro.p1']).toContain('bezosobowe ankiety');
    expect(pl['landing.intro.p2']).toContain('Z tej potrzeby powstał Stage Deck');
    expect(en['landing.intro.p1']).toContain('long, impersonal questionnaires');
    expect(en['landing.intro.p2']).toContain('Stage Deck was born from that requirement');
  });

  it('ships the shared CTA copy in every locale', () => {
    expect(fr['landing.hero.cta']).toBe('Discutons de votre projet');
    expect(pl['landing.hero.cta']).toBe('Porozmawiajmy o Waszym projekcie');
    expect(en['landing.hero.cta']).toBe('Let’s discuss your project');
  });

  it('renders the intro above the hero and the CTA in both places', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    const text = html.replace(/<[^>]+>/g, '');
    expect(text).toContain(fr['landing.intro.p1']);
    expect(text).toContain(fr['landing.intro.p2']);
    expect(text.indexOf(fr['landing.intro.p1'])).toBeLessThan(text.indexOf(fr['landing.hero.title']));

    expect(html.split(fr['landing.hero.cta'])).toHaveLength(3);
  });
});
