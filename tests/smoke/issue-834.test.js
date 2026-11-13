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

describe('issue #834 landing navy conversion banner', () => {
  it('wraps the final CTA in a navy banner with gold ambient glows', () => {
    const landing = read('src/components/LandingPage.jsx');
    const start = landing.indexOf('aria-labelledby="landing-contact"');
    const end = landing.indexOf('landing.footer.partners', start);
    const banner = landing.slice(start, end);

    expect(banner).toContain('overflow-hidden rounded-3xl border border-[#C5A059]/20 bg-[#0B132B]');
    expect(banner).toContain('px-6 py-16');
    expect(banner).toContain('sm:px-10 sm:py-20');
    expect(banner).toContain('text-[#FFFFFF]');
    expect(banner).toContain('text-[#CBD5E1]');
    expect(banner).toContain('bg-[#C5A059]/15 blur-3xl');
    expect(banner).toContain('bg-[#D4AF37]/10 blur-3xl');
    expect(banner.match(/aria-hidden="true"/g).length).toBeGreaterThanOrEqual(2);
    expect(banner).toContain('pointer-events-none');
  });

  it('keeps the contact copy and the shared gold CTA inside the banner', () => {
    const landing = read('src/components/LandingPage.jsx');
    const start = landing.indexOf('aria-labelledby="landing-contact"');
    const end = landing.indexOf('landing.footer.partners', start);
    const banner = landing.slice(start, end);

    expect(banner).toContain("t('landing.footer.ctaTitle')");
    expect(banner).toContain("t('landing.footer.ctaBody')");
    expect(banner).toContain('<ContactCta label={t(\'landing.hero.cta\')} className="mt-8" />');
  });

  it('renders unchanged copy and keeps the partner strip after the banner', () => {
    for (const dictionary of [fr, pl, en]) {
      expect(dictionary['landing.footer.ctaTitle'].trim()).not.toBe('');
      expect(dictionary['landing.footer.ctaBody'].trim()).not.toBe('');
    }

    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain(fr['landing.footer.ctaTitle']);
    expect(html).toContain(fr['landing.footer.ctaBody']);
    expect(html.indexOf(fr['landing.footer.ctaTitle'])).toBeLessThan(
      html.indexOf(fr['landing.footer.partners']),
    );
    expect(html.split(fr['landing.hero.cta'])).toHaveLength(3);
  });
});
