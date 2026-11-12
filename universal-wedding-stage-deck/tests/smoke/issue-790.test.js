import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const SRC = join(fileURLToPath(ROOT), 'src');
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

function parseCsp(toml) {
  const match = toml.match(/Content-Security-Policy = "([^"]+)"/);
  if (!match) throw new Error('Content-Security-Policy header is missing from netlify.toml');
  return Object.fromEntries(
    match[1]
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [directive, ...sources] = part.split(/\s+/);
        return [directive, sources.join(' ')];
      }),
  );
}

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(entry) ? [path] : [];
  });
}





describe('issue #790 Netlify CSP and theme bootstrap', () => {
  const toml = read('../netlify.toml');
  const csp = parseCsp(toml);
  const connectSources = csp['connect-src'].split(/\s+/);

  it('keeps script-src at self without inline allowances', () => {
    expect(csp['script-src']).toBe("'self'");
    expect(toml).not.toContain('unsafe-inline');
    expect(toml).not.toContain('unsafe-eval');
  });

  it('allows the exact Supabase HTTPS and WSS origin', () => {
    const httpsOrigin = connectSources.find((source) =>
      /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(source),
    );
    const wssOrigin = connectSources.find((source) =>
      /^wss:\/\/[a-z0-9-]+\.supabase\.co$/.test(source),
    );
    expect(httpsOrigin).toBeTruthy();
    expect(wssOrigin).toBeTruthy();
    expect(wssOrigin).toBe(httpsOrigin.replace('https://', 'wss://'));
    expect(connectSources.some((source) => source.includes('*'))).toBe(false);
    expect(connectSources).not.toContain('https:');
    expect(connectSources).not.toContain('wss:');
  });

  it('allows the sunset lookup origin used by the admin Drive import', () => {
    const endpoint = read('src/lib/sunsetLookup.js').match(
      /SUNSET_ENDPOINT = '([^']+)'/,
    )?.[1];
    expect(endpoint).toBeTruthy();
    expect(connectSources).toContain(new URL(endpoint).origin);
  });

  it('keeps the remaining directives compatible with the app', () => {
    expect(csp['default-src']).toBe("'self'");
    expect(csp['style-src']).toContain('https://fonts.googleapis.com');
    expect(csp['font-src']).toContain('https://fonts.gstatic.com');
    expect(csp['img-src']).toContain('data:');
    expect(csp['worker-src']).toBe("'self'");
    expect(csp['manifest-src']).toBe("'self'");
    expect(csp['frame-ancestors']).toBe("'none'");
    expect(csp['frame-src']).toBe("'none'");
    expect(csp['object-src']).toBe("'none'");
  });

  it('loads the theme bootstrap as an external blocking script before the app entry', () => {
    const html = read('index.html');
    const inlineScript = /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i;
    expect(html).not.toMatch(inlineScript);
    expect(html).toMatch(/<script src="\/theme-bootstrap\.js"><\/script>/);

    const bootstrapIndex = html.indexOf('/theme-bootstrap.js');
    const appIndex = html.indexOf('/src/main.jsx');
    expect(bootstrapIndex).toBeGreaterThan(-1);
    expect(appIndex).toBeGreaterThan(bootstrapIndex);
  });
});

describe('issue #790 theme bootstrap behavior', () => {
  const bootstrap = read('public/theme-bootstrap.js');

  function runBootstrap({ raw = null, prefersLight = false } = {}) {
    const meta = {
      content: '#070b19',
      setAttribute(name, value) {
        this[name] = value;
      },
    };
    const documentElement = { dataset: {}, style: {} };
    const sandbox = {
      JSON,
      window: { matchMedia: () => ({ matches: prefersLight }) },
      localStorage: { getItem: () => raw },
      document: {
        documentElement,
        querySelector: (selector) =>
          selector === 'meta[name="theme-color"]' ? meta : null,
      },
    };
    runInNewContext(bootstrap, sandbox);
    return { documentElement, meta };
  }

  it('applies a stored day theme and updates the meta color', () => {
    const { documentElement, meta } = runBootstrap({
      raw: JSON.stringify({ theme: 'day' }),
    });
    expect(documentElement.dataset.theme).toBe('day');
    expect(documentElement.style.colorScheme).toBe('light');
    expect(meta.content).toBe('#eef2f7');
  });

  it('uses prefers-color-scheme when no valid theme is stored', () => {
    expect(runBootstrap({ prefersLight: true }).documentElement.dataset.theme).toBe('day');
    expect(runBootstrap({ raw: JSON.stringify({ theme: 'sepia' }) }).documentElement.dataset.theme).toBe(
      'night',
    );
  });

  it('defaults to night and survives corrupt storage', () => {
    const fresh = runBootstrap();
    expect(fresh.documentElement.dataset.theme).toBe('night');
    expect(fresh.meta.content).toBe('#070b19');

    const corrupt = runBootstrap({ raw: '{not-json' });
    expect(corrupt.documentElement.dataset.theme).toBe('night');
  });
});

describe('issue #790 environment documentation', () => {
  const example = read('.env.example');

  it('documents the Netlify production values without server secrets', () => {
    expect(example).toMatch(/Netlify build environment variables/);
    expect(example).toMatch(/VITE_DECK_MODE=production/);
    expect(example).toMatch(/Never add server secrets to Netlify/);
    expect(example).toMatch(/VITE_ADMIN_DEMO and VITE_VIEW unset/);
  });

  it('documents every VITE_ variable read by the browser code', () => {
    const used = new Set();
    for (const file of sourceFiles(SRC)) {
      for (const match of readFileSync(file, 'utf8').matchAll(
        /import\.meta\.env\.(VITE_[A-Z0-9_]+)/g,
      )) {
        used.add(match[1]);
      }
    }
    expect(used.size).toBeGreaterThan(0);
    for (const name of used) expect(example).toContain(name);
  });

  it('never reads process.env from browser source', () => {
    const offenders = sourceFiles(SRC).filter((file) =>
      readFileSync(file, 'utf8').includes('process.env'),
    );
    expect(offenders).toEqual([]);
  });
});
