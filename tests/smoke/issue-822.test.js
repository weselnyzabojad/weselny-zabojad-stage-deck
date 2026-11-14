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

describe('issue #822 landing partner logos', () => {
  it('ships the partner label in every locale', () => {
    expect(fr['landing.footer.partners']).toBe('En partenariat avec :');
    expect(pl['landing.footer.partners']).toBe('We współpracy z:');
    expect(en['landing.footer.partners']).toBe('In partnership with:');
  });

  it('renders both partner logos above the footer bottom row', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain('En partenariat avec :');
    expect(html).toContain('alt="DJ Mark"');
    expect(html).toContain('alt="DJ Szymoniak"');
    expect(html.indexOf('En partenariat avec :')).toBeLessThan(
      html.indexOf(fr['landing.footer.note']),
    );
  });

  it('keeps the logos non-interactive', () => {
    const landing = read('src/components/LandingPage.jsx');
    const start = landing.indexOf("landing.footer.partners");
    const end = landing.indexOf(
      '<div className="mx-auto flex w-full max-w-6xl flex-col',
      start,
    );
    const partnerBlock = landing.slice(start, end);

    expect(partnerBlock).toContain('src={partner.logoUrl}');
    expect(partnerBlock).toContain('{partners.map((partner) => (');
    expect(partnerBlock).not.toContain('<a');
  });
});
