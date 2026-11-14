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
  it('keeps both registry logos at the same accessible size', () => {
    const landing = read('src/components/LandingPage.jsx');

    expect(landing).toContain('{partners.map((partner) => (');
    expect(landing).toContain('src={partner.logoUrl}');
    expect(landing).toContain('alt={partner.displayName}');
    expect(landing).toContain('h-20 w-auto object-contain sm:h-24');
    expect(landing).toContain("displayName: 'DJ Mark'");
    expect(landing).toContain("displayName: 'DJ Szymoniak'");
  });

  it('renders both partner logos with their accessible names', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain('alt="DJ Mark"');
    expect(html).toContain('alt="DJ Szymoniak"');
  });
});
