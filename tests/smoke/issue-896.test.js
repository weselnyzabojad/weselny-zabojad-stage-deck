import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../../src/components/LandingPage.jsx';
import en from '../../src/i18n/en.js';
import fr from '../../src/i18n/fr.js';
import pl from '../../src/i18n/pl.js';
import { isLandingPath } from '../../src/lib/publicRoutes.js';
import { setLocale } from '../../src/i18n/index.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #896 landing footer partners', () => {
  it('uses a light premium partner card with larger logos', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('border-[#C5A059]/40 bg-white px-6 py-10');
    expect(landing).toContain('shadow-lg shadow-[#C5A059]/10');
    expect(landing).toContain('gap-x-10 gap-y-6 sm:gap-x-16');
    expect(landing).toContain('className="h-20 w-auto object-contain sm:h-24"');
    expect(landing).toContain('className="h-14 w-auto object-contain sm:h-16"');
    expect(landing).toContain('alt="DJ Mark"');
    expect(landing).toContain('alt="DJ Szymoniak"');
  });

  it('removes the crew link from the landing and the dictionaries', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).not.toContain('landing.footer.crew');
    expect(landing).not.toContain('href="/join"');
    expect(fr['landing.footer.crew']).toBeUndefined();
    expect(pl['landing.footer.crew']).toBeUndefined();
    expect(en['landing.footer.crew']).toBeUndefined();
  });

  it('keeps only the centred copyright note in the bottom row', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain(
      'border-[#C5A059]/15 px-4 py-6 text-center text-xs text-muted sm:px-6',
    );
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));
    expect(html).toContain(fr['landing.footer.note']);
    expect(html).not.toContain(fr['landing.hero.cta'] + '</a>' + fr['landing.footer.note']);
  });

  it('keeps the /join route reachable outside the landing footer', () => {
    expect(isLandingPath('/join')).toBe(false);
    expect(read('src/main.jsx')).toContain('<App />');
  });
});
