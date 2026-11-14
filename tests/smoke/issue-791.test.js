import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #791 PWA registration at the subdomain root', () => {
  const main = read('src/main.jsx');
  const vite = read('vite.config.js');
  const prompt = read('src/components/PwaUpdatePrompt.jsx');

  it('registers the service worker from a route-independent mount', () => {
    expect(main.match(/<PwaUpdatePrompt \/>/g)).toHaveLength(1);

    const boundaryEnd = main.indexOf('</AppErrorBoundary>');
    const promptMount = main.indexOf('<PwaUpdatePrompt />');
    expect(boundaryEnd).toBeGreaterThan(-1);
    expect(promptMount).toBeGreaterThan(boundaryEnd);

    // The deck branch must not own the only registration any more.
    expect(main).not.toMatch(/<App \/>\s*<PwaUpdatePrompt \/>/);
  });

  it('keeps the manifest and service worker root-relative', () => {
    expect(vite).toContain("registerType: 'prompt'");
    expect(vite).toContain('injectRegister: null');
    for (const key of ['id', 'scope', 'start_url']) {
      expect(vite).toMatch(new RegExp(`${key}: '\\./'`));
    }
    expect(vite).not.toContain('/deck/');
  });

  it('does not cache Supabase responses in Workbox', () => {
    expect(vite).not.toMatch(/supabase/i);
    expect(vite).toContain('runtimeCaching');
    expect(vite).toContain('fonts\\.googleapis\\.com');
    expect(vite).toContain('fonts\\.gstatic\\.com');
  });

  it('keeps updates deferred and production-only', () => {
    expect(prompt).toContain("if (!import.meta.env.PROD || typeof window === 'undefined') return undefined;");
    expect(prompt).toContain('if (!import.meta.env.PROD) return null;');
    expect(prompt).toContain('reloadRequestedRef');
    expect(prompt).toContain('onNeedReload');
  });
});
