import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

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

describe('issue #861 Sentry CSP allowlist', () => {
  const toml = read('netlify.toml');
  const csp = parseCsp(toml);
  const sentry = read('src/lib/sentry.js');
  const dsn = sentry.match(/DEFAULT_SENTRY_DSN =\s*\n?\s*'([^']+)'/)?.[1];

  it('allows the exact Sentry ingest origin used by the default DSN', () => {
    expect(dsn).toBeTruthy();
    const origin = new URL(dsn).origin;
    expect(origin).toBe('https://o4512420559716352.ingest.de.sentry.io');
    expect(csp['connect-src'].split(/\s+/)).toContain(origin);
  });

  it('allows the Session Replay blob worker without widening script policy', () => {
    expect(csp['worker-src'].split(/\s+/)).toEqual(["'self'", 'blob:']);
    expect(csp['script-src']).toBe("'self'");
    expect(toml).not.toContain('unsafe-inline');
    expect(toml).not.toContain('unsafe-eval');
  });
});
