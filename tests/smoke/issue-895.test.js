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

describe('issue #895 FAQ and final CTA copy', () => {
  it('ships warm answers without technical or restrictive jargon', () => {
    expect(fr['landing.faq.1.a']).toContain('aucune obligation');
    expect(fr['landing.faq.2.a']).toContain('aucun compte n’est requis');
    expect(fr['landing.faq.3.a']).toContain('Rien ne s’arrête');
    expect(fr['landing.faq.4.a']).toContain('100 % privé et sécurisé');
    expect(fr['landing.faq.5.a']).toContain('sans le moindre frais supplémentaire');

    expect(pl['landing.faq.1.a']).toContain('bez żadnego obowiązku');
    expect(pl['landing.faq.3.a']).toContain('Nic się nie zatrzymuje');
    expect(en['landing.faq.1.a']).toContain('no obligation at all');
    expect(en['landing.faq.3.a']).toContain('Nothing stops');

    for (const dictionary of [fr, pl, en]) {
      for (const index of [1, 2, 3, 4, 5]) {
        expect(dictionary[`landing.faq.${index}.a`]).not.toMatch(
          /dépend du rôle|only send|seulement|session/i,
        );
      }
    }
  });

  it('modernises the final CTA body and keeps the shared label', () => {
    expect(fr['landing.footer.ctaBody']).toContain('mariage élégant, fluide et parfaitement orchestré');
    expect(pl['landing.footer.ctaBody']).toContain('eleganckim, płynnym i perfekcyjnie');
    expect(en['landing.footer.ctaBody']).toContain('elegant, seamless and perfectly orchestrated');

    expect(fr['landing.hero.cta']).toBe('Discutons de votre projet');
    expect(pl['landing.hero.cta']).toBe('Porozmawiajmy o Waszym projekcie');
    expect(en['landing.hero.cta']).toBe('Let’s discuss your project');
  });

  it('renders the new answers and CTA body with native FAQ details', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain(fr['landing.faq.1.a']);
    expect(html).toContain(fr['landing.faq.5.a']);
    expect(html).toContain(fr['landing.footer.ctaBody']);
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
  });
});
