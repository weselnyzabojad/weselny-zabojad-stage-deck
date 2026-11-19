import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BANNER_FALLBACK_LOCALE,
  detectBannerLocale,
  isBannerPath,
  isLandingPath,
} from '../src/lib/publicRoutes.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const netlify = read('netlify.toml');
const main = read('src/main.jsx');
const landingMain = read('src/landing-main.jsx');
const landing = read('src/components/LandingPage.jsx');

function block(prefix) {
  const start = netlify.indexOf(`for = "${prefix}"`);
  const next = netlify.indexOf('[[headers]]', start);
  return netlify.slice(start, next === -1 ? undefined : next);
}

const cspOf = (source) => /Content-Security-Policy = "([^"]+)"/.exec(source)?.[1] ?? '';

describe('issue #1239 landing iframe route /extra/banner', () => {
  it('recognises only the banner route and keeps the root landing separate', () => {
    expect(isBannerPath('/extra/banner')).toBe(true);
    expect(isBannerPath('/extra/banner/')).toBe(true);
    expect(isBannerPath('/deck/extra/banner', '/deck/')).toBe(true);
    expect(isBannerPath('/extra/banner/other')).toBe(false);
    expect(isBannerPath('/')).toBe(false);
    expect(isLandingPath('/')).toBe(true);
    expect(isLandingPath('/extra/banner')).toBe(false);
  });

  it('follows browser languages and falls back to French', () => {
    expect(detectBannerLocale(['pl-PL', 'fr-FR'])).toBe('pl');
    expect(detectBannerLocale(['fr-CA'])).toBe('fr');
    expect(detectBannerLocale(['en-GB'])).toBe('en');
    expect(detectBannerLocale(['de-DE', 'es-ES'])).toBe(BANNER_FALLBACK_LOCALE);
    expect(detectBannerLocale([])).toBe('fr');
    expect(detectBannerLocale(undefined)).toBe('fr');
    expect(detectBannerLocale('PL')).toBe('pl');
  });

  it('renders the landing at the banner route without the PWA prompt', () => {
    expect(main).toContain('isBannerPath(window.location.pathname');
    expect(main).toContain('IS_LANDING || IS_BANNER');
    expect(main).toContain('IS_LANDING || IS_BANNER || RECAP_TOKEN || EMBED_ROUTE ? null');
    expect(landingMain).toContain('isBannerPath(window.location.pathname');
    expect(landingMain).toContain('detectBannerLocale(');
  });

  it('frames /extra/banner only for the two WordPress origins', () => {
    const banner = block('/extra/banner');
    expect(banner.length).toBeGreaterThan(0);
    expect(cspOf(banner)).toContain(
      "frame-ancestors 'self' https://www.weselnyzabojad.pl https://weselnyzabojad.pl;",
    );
    expect(cspOf(banner)).not.toMatch(/frame-ancestors[^;]*\*/);
    expect(netlify.indexOf('for = "/extra/banner"')).toBeLessThan(
      netlify.indexOf('for = "/*"'),
    );
    expect(cspOf(block('/*'))).toContain("frame-ancestors 'none';");
    expect(netlify).not.toContain('X-Frame-Options =');
  });

  it('keeps the contact CTA URL and new-tab attributes unchanged', () => {
    expect(landing).toContain("import { getMainSiteUrl } from '../lib/mainSite.js'");
    expect(landing).toContain("new URL(getMainSiteUrl('pl'))");
    expect(landing).toContain("url.searchParams.set('prefill', prefill);");
    expect(landing).toContain("url.hash = 'kontakt';");
    expect(landing).toContain('target="_blank"');
    expect(landing).toContain('rel="noopener noreferrer"');
  });
});
