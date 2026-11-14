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

function contactHref(prefill) {
  const url = new URL('https://www.weselnyzabojad.pl/');
  url.searchParams.set('prefill', prefill);
  url.hash = 'kontakt';
  return url.toString();
}

describe('issue #818 landing intro and contact CTA copy', () => {
  it('ships the new intro copy in every locale', () => {
    expect(fr['landing.intro.p1']).toBe(
      'Parce qu’un mariage mérite mieux que de simples questionnaires incompréhensibles, Weselny Żabojad traite chaque événement comme un véritable projet coconstruit, fondé sur l’écoute et le dialogue.',
    );
    expect(fr['landing.intro.p2']).toBe(
      'De cette approche est né le Stage Deck : un outil collaboratif pensé pour relier tous les prestataires et leur permettre de travailler en parfaite synergie le jour J, vous laissant ainsi l’esprit entièrement libre pour profiter de votre bonheur.',
    );

    expect(pl['landing.intro.p1']).toContain('Bo wesele zasługuje na coś więcej');
    expect(pl['landing.intro.p2']).toContain('Z tego podejścia powstał Stage Deck');
    expect(en['landing.intro.p1']).toContain('Because a wedding deserves more');
    expect(en['landing.intro.p2']).toContain('Stage Deck was born from that approach');
  });

  it('ships the contact CTA copy in every locale', () => {
    expect(fr['landing.footer.ctaTitle']).toBe('Faisons équipe le jour J');
    expect(fr['landing.footer.ctaBody']).toBe(
      'Contactez-nous : découvrez comment l’accompagnement de Weselny Żabojad couplé au Stage Deck garantit une coordination parfaite et une réussite éclatante.',
    );
    expect(fr['landing.hero.cta']).toBe('Formulaire de contact');

    expect(pl['landing.footer.ctaTitle']).toBe('Połączmy siły w dniu ślubu');
    expect(pl['landing.footer.ctaBody']).toContain('wsparcie Weselny Żabojad połączone ze Stage Deck');
    expect(pl['landing.hero.cta']).toBe('Formularz kontaktowy');

    expect(en['landing.footer.ctaTitle']).toBe('Let’s team up on the big day');
    expect(en['landing.footer.ctaBody']).toContain('Weselny Żabojad’s support combined with Stage Deck');
    expect(en['landing.hero.cta']).toBe('Contact form');
  });

  it('renders the new intro above the hero and the contact copy in the footer', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    const text = html.replace(/<[^>]+>/g, '');
    expect(text).toContain(fr['landing.intro.p1']);
    expect(text).toContain(fr['landing.intro.p2']);
    expect(text).not.toContain('Finies les enquêtes clients impersonnelles');
    expect(text.indexOf(fr['landing.intro.p1'])).toBeLessThan(text.indexOf(fr['landing.hero.title']));

    expect(html).toContain('Faisons équipe le jour J');
    expect(html).toContain(fr['landing.footer.ctaBody']);
    expect(html.split('Formulaire de contact')).toHaveLength(3);
  });

  it('keeps both CTA buttons on the contact form URL', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));
    const hrefs = html.split(`href="${contactHref(fr['landing.contact.prefill'])}"`).length - 1;

    expect(hrefs).toBe(2);
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
