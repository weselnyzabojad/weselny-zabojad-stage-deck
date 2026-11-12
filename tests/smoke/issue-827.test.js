import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../../src/components/LandingPage.jsx';
import { setLocale } from '../../src/i18n/index.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #827 footer DJ Mark logo', () => {
  it('enlarges Mark without changing Szymoniak', () => {
    const landing = read('src/components/LandingPage.jsx');

    const markStart = landing.indexOf('src={logoMark}');
    const szymoniakStart = landing.indexOf('src={logoSzymoniak}');
    const markBlock = landing.slice(markStart, szymoniakStart);
    const szymoniakBlock = landing.slice(szymoniakStart, landing.indexOf('</div>', szymoniakStart));

    expect(markBlock).toContain('alt="DJ Mark"');
    expect(markBlock).toContain('h-14 w-auto object-contain sm:h-16');
    expect(szymoniakBlock).toContain('alt="DJ Szymoniak"');
    expect(szymoniakBlock).toContain('h-10 w-auto object-contain sm:h-12');
  });

  it('renders both partner logos with their accessible names', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain('alt="DJ Mark"');
    expect(html).toContain('alt="DJ Szymoniak"');
  });
});
