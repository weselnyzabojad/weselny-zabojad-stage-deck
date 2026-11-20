import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  isPublicSurface,
  parseReleaseSurface,
  RELEASE_SURFACES,
} from '../src/lib/releaseSurface.js';
import { resolvePublicRoute } from '../src/lib/publicRelease.js';
import {
  PUBLIC_ENTRY_FILE,
  PUBLIC_ENTRY_SCRIPT,
  PUBLIC_REDIRECTS,
} from '../scripts/vite-plugin-release-surface.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('public under-construction release surface (issue #1298)', () => {
  it('accepts public while keeping full as the default', () => {
    expect(RELEASE_SURFACES).toEqual(['full', 'landing', 'public']);
    expect(parseReleaseSurface(undefined)).toBe('full');
    expect(parseReleaseSurface('public')).toBe('public');
    expect(parseReleaseSurface(' PUBLIC ')).toBe('public');
    expect(isPublicSurface('public')).toBe(true);
    expect(isPublicSurface('landing')).toBe(false);
    expect(isPublicSurface('full')).toBe(false);
    expect(() => parseReleaseSurface('public-only')).toThrow(
      /Invalid RELEASE_SURFACE="public-only".*full.*landing.*public/,
    );
  });

  it('resolves only the placeholder and the season embed as public routes', () => {
    expect(resolvePublicRoute('/')).toEqual({ kind: 'home' });
    expect(resolvePublicRoute('/index.html')).toEqual({ kind: 'home' });
    expect(resolvePublicRoute('/deck/', '', '/deck/')).toEqual({ kind: 'home' });

    expect(
      resolvePublicRoute('/embed/season-stats', '?lang=fr&theme=cream'),
    ).toEqual({
      kind: 'embed',
      embed: { lang: 'fr', theme: 'cream', previewState: null },
    });
    expect(
      resolvePublicRoute('/embed/season-stats/', '?lang=pl'),
    ).toMatchObject({ kind: 'embed', embed: { lang: 'pl' } });

    for (const path of ['/extra/banner', '/join', '/admin', '/recap/token', '/status', '/unknown']) {
      expect(resolvePublicRoute(path)).toEqual({ kind: 'not-found' });
    }
  });

  it('uses a dedicated public HTML entry with the public module', () => {
    const full = read('index.html');
    const publicHtml = read(PUBLIC_ENTRY_FILE);
    expect(PUBLIC_ENTRY_SCRIPT).toBe('/src/public-main.jsx');
    expect(publicHtml).toContain(`<script type="module" src="${PUBLIC_ENTRY_SCRIPT}"></script>`);
    expect(publicHtml).not.toContain('/src/main.jsx');
    expect(publicHtml).not.toContain('/src/landing-main.jsx');

    const normalize = (html) =>
      html
        .replace(/\r\n/g, '\n')
        .replace(/<script type="module" src="\/src\/(main|landing-main|public-main)\.jsx"><\/script>/, '')
        .replace(
          /\s*<!-- Wedding Monitor PWA[\s\S]*?<script src="\/status-bootstrap\.js" defer><\/script>/,
          '',
        );
    expect(normalize(publicHtml)).toBe(normalize(full));
  });

  it('keeps the public entry free of deck, admin, landing and PWA modules', () => {
    const entry = read('src/public-main.jsx');
    expect(entry).toContain("import('./components/ComingSoonPage.jsx')");
    expect(entry).toContain("import('./components/PublicSeasonStatsWidget.jsx')");
    expect(entry).toContain("import { resolvePublicRoute } from './lib/publicRelease.js'");
    expect(entry).toContain('{ persist: false }');

    for (const forbidden of [
      "import App from './App.jsx'",
      'AdminApp',
      'SongRequestApp',
      'WeddingRecapPage',
      'LandingPage',
      'PwaUpdatePrompt',
      'admin/adminUtils',
      'songRequests.js',
    ]) {
      expect(entry).not.toContain(forbidden);
    }
  });

  it('allowlists only the two public routes and a real 404', () => {
    expect(PUBLIC_REDIRECTS).toContain('/index.html               /index.html  200');
    expect(PUBLIC_REDIRECTS).toContain('/                         /index.html  200');
    expect(PUBLIC_REDIRECTS).toContain('/embed/season-stats       /index.html  200');
    expect(PUBLIC_REDIRECTS).toContain('/embed/season-stats/      /index.html  200');
    expect(PUBLIC_REDIRECTS).toContain('/assets/*                 /404.html    404');
    expect(PUBLIC_REDIRECTS).toContain('/*                        /404.html    404');
    expect(PUBLIC_REDIRECTS).not.toContain('/extra/banner');
    expect(PUBLIC_REDIRECTS).not.toContain('/*    /index.html    200');
  });

  it('renames the public entry and disables the PWA in public mode', () => {
    const config = read('vite.config.js');
    expect(config).toContain('isPublicSurface');
    expect(config).toContain("'index.public.html'");
    expect(config).toContain('landingSurfacePlugin({ landing, publicSurface })');
    expect(config).toContain('!landing && !publicSurface && VitePWA({');

    const plugin = read('scripts/vite-plugin-release-surface.mjs');
    expect(plugin).toContain('PUBLIC_ENTRY_FILE');
    expect(plugin).toContain('PUBLIC_REDIRECTS');
    expect(plugin).toContain("rm(path.join(outDir, 'status')");
    expect(plugin).toContain("rm(path.join(outDir, 'status-bootstrap.js')");
  });

  it('ships an artifact checker that rejects deck, landing and PWA output', () => {
    const verify = read('scripts/verify-public-build.mjs');
    expect(verify).toContain('AdminApp');
    expect(verify).toContain('SongRequestApp');
    expect(verify).toContain('WeddingRecapPage');
    expect(verify).toContain('PwaUpdatePrompt');
    expect(verify).toContain('LandingPage');
    expect(verify).toContain("'sw.js'");
    expect(verify).toContain("'manifest.webmanifest'");
    expect(verify).toContain('status-bootstrap.js');
    expect(verify).toContain('/embed/season-stats');
    expect(verify).toContain('/extra/banner must not be public');
  });
});
