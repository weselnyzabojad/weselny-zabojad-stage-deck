import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import LandingPage from '../../src/components/LandingPage.jsx';
import fr from '../../src/i18n/fr.js';
import { setLocale } from '../../src/i18n/index.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #832 landing partner trust strip', () => {
  it('styles the existing partner label as an uppercase tracked divider header', () => {
    const landing = read('src/components/LandingPage.jsx');
    const start = landing.indexOf('rounded-2xl border border-[#C5A059]/20 bg-white/80');
    const end = landing.indexOf('<div className="mx-auto flex w-full max-w-6xl flex-col', start);
    const partnerBlock = landing.slice(start, end);

    expect(partnerBlock).toContain('uppercase tracking-[0.2em]');
    expect(partnerBlock).toContain('text-[#8A6A2F]');
    expect(partnerBlock).toContain('bg-white/80');
    expect(partnerBlock).toContain('border-[#C5A059]/20');
    expect(partnerBlock.match(/aria-hidden="true"/g)).toHaveLength(2);
  });

  it('keeps the logos at their shipped sizes and non-interactive', () => {
    const landing = read('src/components/LandingPage.jsx');
    const start = landing.indexOf('rounded-2xl border border-[#C5A059]/20 bg-white/80');
    const end = landing.indexOf('<div className="mx-auto flex w-full max-w-6xl flex-col', start);
    const partnerBlock = landing.slice(start, end);

    expect(partnerBlock).toContain('src={logoMark}');
    expect(partnerBlock).toContain('alt="DJ Mark"');
    expect(partnerBlock).toContain('h-14 w-auto object-contain sm:h-16');
    expect(partnerBlock).toContain('src={logoSzymoniak}');
    expect(partnerBlock).toContain('alt="DJ Szymoniak"');
    expect(partnerBlock).toContain('h-10 w-auto object-contain sm:h-12');
    expect(partnerBlock).not.toContain('<a');
  });

  it('keeps the label copy and its order above the footer note', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain(fr['landing.footer.partners']);
    expect(html.indexOf(fr['landing.footer.partners'])).toBeLessThan(
      html.indexOf(fr['landing.footer.note']),
    );
  });
});
