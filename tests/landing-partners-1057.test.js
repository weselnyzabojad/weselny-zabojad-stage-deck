import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LandingPage from '../src/components/LandingPage.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1057 landing partner strip three-logo set', () => {
  it('renders Mark, Szymoniak and Zaremba in the fallback strip', () => {
    const html = renderToStaticMarkup(createElement(LandingPage));
    expect(html).toContain('alt="DJ Mark"');
    expect(html).toContain('alt="DJ Szymoniak"');
    expect(html).toContain('alt="DJ Zaremba"');
  });

  it('maps built-in ids to bundled assets and keeps API rows from replacing them', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain("import logoZaremba from '../assets/img/dj-vip/logo_zaremba.png'");
    expect(landing).toContain('const BUILTIN_PARTNER_LOGOS');
    expect(landing).toContain('mergePartners(rows)');
    expect(landing).toContain('byId.delete(partner.id)');
    expect(landing).toContain('row.logoUrl');
  });

  it('uses centered flex wrapping with a common max-height', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('flex flex-wrap items-center justify-center gap-x-12 gap-y-6 sm:gap-x-16');
    expect(landing).toContain('max-h-[60px] w-auto object-contain sm:max-h-20');
    expect(landing).not.toContain('h-20 w-auto object-contain');
  });
});
