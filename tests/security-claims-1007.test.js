import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1007 landing security claim audit', () => {
  const doc = read('docs/security-claims.md');

  it('maps every advertised technical claim to evidence', () => {
    for (const claim of [
      'HTTPS/TLS',
      'HSTS with preload',
      'CSP and security headers',
      'ES256',
      'bcrypt',
      'throttling',
      '24-hour role tokens',
      'TOTP/AAL2',
      'audit log',
      'row-level security',
      'AES-256-GCM',
      'HKDF',
      'Sentry PII',
      'Error-only session replay',
      'TTL',
    ]) {
      expect(doc, claim).toContain(claim);
    }
  });

  it('points at real implementation paths', () => {
    for (const file of [
      'netlify.toml',
      'supabase/functions/join_room/index.ts',
      'supabase/functions/_shared/adminAuth.js',
      'supabase/functions/_shared/bundleCrypto.js',
      'src/lib/sentry.js',
      'supabase/schema.sql',
    ]) {
      expect(doc, file).toContain(file);
    }
  });

  it('records caveats and forbids certification/absolute claims', () => {
    expect(doc).toContain('verified with deployment caveat');
    expect(doc).toContain('process statement');
    expect(doc).toContain('Do not publish');
    expect(doc).toContain('Certified');
    expect(doc).toContain('Unhackable');
    const publishedCopy = read('src/i18n/en.js');
    expect(publishedCopy.toLowerCase()).not.toContain('unhackable');
  });
});
