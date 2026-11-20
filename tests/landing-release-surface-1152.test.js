import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  isLandingSurface,
  parseReleaseSurface,
  RELEASE_SURFACES,
} from '../src/lib/releaseSurface.js';
import {
  LANDING_ENTRY_FILE,
  LANDING_ENTRY_SCRIPT,
  LANDING_REDIRECTS,
} from '../scripts/vite-plugin-release-surface.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('landing-only release surface (issue #1152)', () => {
  it('defaults to the full release and accepts the documented values', () => {
    expect(RELEASE_SURFACES).toEqual(['full', 'landing', 'public']);
    expect(parseReleaseSurface(undefined)).toBe('full');
    expect(parseReleaseSurface('')).toBe('full');
    expect(parseReleaseSurface('   ')).toBe('full');
    expect(parseReleaseSurface('full')).toBe('full');
    expect(parseReleaseSurface('LANDING')).toBe('landing');
    expect(parseReleaseSurface(' landing ')).toBe('landing');
    expect(isLandingSurface('landing')).toBe(true);
    expect(isLandingSurface('full')).toBe(false);
  });

  it('fails fast on an invalid release surface', () => {
    expect(() => parseReleaseSurface('landing-only')).toThrow(
      /Invalid RELEASE_SURFACE="landing-only".*full.*landing/,
    );
  });

  it('uses a dedicated landing HTML entry with the landing module', () => {
    const full = read('index.html');
    const landingHtml = read(LANDING_ENTRY_FILE);
    expect(LANDING_ENTRY_SCRIPT).toBe('/src/landing-main.jsx');
    expect(landingHtml).toContain(`<script type="module" src="${LANDING_ENTRY_SCRIPT}"></script>`);
    expect(landingHtml).not.toContain('/src/main.jsx');
    // Same head/body as the full entry except the module script, so the two
    // documents cannot drift on SEO, fonts or theme bootstrap.
    const normalize = (html) =>
      html
        .replace(/\r\n/g, '\n')
        .replace(/<script type="module" src="\/src\/(main|landing-main)\.jsx"><\/script>/, '')
        .replace(
          /\s*<!-- Wedding Monitor PWA[\s\S]*?<script src="\/status-bootstrap\.js" defer><\/script>/,
          '',
        );
    expect(normalize(landingHtml)).toBe(normalize(full));
  });

  it('keeps the landing entry free of deck, admin, request, recap and PWA modules', () => {
    const entry = read('src/landing-main.jsx');
    expect(entry).toContain("import('./components/LandingPage.jsx')");
    expect(entry).toContain("import AppErrorBoundary from './components/AppErrorBoundary.jsx'");
    expect(entry).toContain("import { initSentry } from './lib/sentry.js'");

    for (const forbidden of [
      "import App from './App.jsx'",
      'AdminApp',
      'SongRequestApp',
      'WeddingRecapPage',
      'PwaUpdatePrompt',
      'admin/adminUtils',
      'songRequests.js',
      'publicRoutes.js',
    ]) {
      expect(entry).not.toContain(forbidden);
    }
  });

  it('serves only the landing document and a real 404 on every other route', () => {
    expect(LANDING_REDIRECTS).toContain('/index.html  /index.html  200');
    expect(LANDING_REDIRECTS).toContain('/            /index.html  200');
    expect(LANDING_REDIRECTS).toContain('/*           /404.html    404');
    expect(LANDING_REDIRECTS).not.toContain('/*    /index.html    200');
  });

  it('disables the PWA and copies the branded 404 in landing mode only', () => {
    const config = read('vite.config.js');
    expect(config).toContain('landingSurfacePlugin({ landing, publicSurface })');
    expect(config).toContain('!landing && !publicSurface && VitePWA({');
    expect(config).toContain('parseReleaseSurface(process.env.RELEASE_SURFACE)');

    // Issue #1288: landing-only artifacts must not ship the monitor PWA.
    const plugin = read('scripts/vite-plugin-release-surface.mjs');
    expect(plugin).toContain("rm(path.join(outDir, 'status')");
    expect(plugin).toContain("rm(path.join(outDir, 'status-bootstrap.js')");
  });

  it('ships an artifact checker that rejects deck and PWA output', () => {
    const verify = read('scripts/verify-landing-build.mjs');
    expect(verify).toContain('AdminApp');
    expect(verify).toContain('SongRequestApp');
    expect(verify).toContain('WeddingRecapPage');
    expect(verify).toContain('PwaUpdatePrompt');
    expect(verify).toContain("'sw.js'");
    expect(verify).toContain("'manifest.webmanifest'");
    expect(verify).toContain('/*           /404.html    404');
  });

  it('copies absolute 404 asset paths so nested routes keep their styling', () => {
    const html = read('release/landing/404.html');
    expect(html).toContain('href="/404.css"');
    expect(html).toContain('href="/favicon.svg"');
    expect(html).not.toContain('href="404.css"');
  });
});
