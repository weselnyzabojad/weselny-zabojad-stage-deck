import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assertLocalSupabaseUrl, isLocalSupabaseUrl } from '../scripts/lib/local-guard.mjs';
import { validateEnv } from '../scripts/validate-env.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #919 production isolation guards', () => {
  it('accepts only local Supabase targets in the shared guard', () => {
    expect(isLocalSupabaseUrl('http://127.0.0.1:54321')).toBe(true);
    expect(isLocalSupabaseUrl('http://localhost:54321')).toBe(true);
    expect(isLocalSupabaseUrl('http://[::1]:54321')).toBe(true);
    expect(isLocalSupabaseUrl('https://qdcuxefperykmjlirufe.supabase.co')).toBe(false);
    expect(() => assertLocalSupabaseUrl('https://example.supabase.co')).toThrow(/hosted project/);
  });

  it('uses the guard in the seed and stack scripts', () => {
    expect(read('scripts/seed-local.mjs')).toContain('assertLocalSupabaseUrl');
    expect(read('scripts/local-supabase.mjs')).toContain('assertLocalSupabaseUrl');
  });

  it('rejects localhost in production env validation', () => {
    const base = {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'local-anon-key-with-enough-length',
      VITE_DECK_MODE: 'production',
    };
    const local = validateEnv(base, { requireProduction: true });
    expect(local.errors.join(' ')).toMatch(/localhost/);
    const hosted = validateEnv(
      {
        ...base,
        VITE_SUPABASE_URL: 'https://qdcuxefperykmjlirufe.supabase.co',
      },
      { requireProduction: true },
    );
    expect(hosted.errors).toEqual([]);
  });

  it('does not run remote-mutating commands from local scripts', () => {
    for (const path of [
      'scripts/local-supabase.mjs',
      'scripts/seed-local.mjs',
      'scripts/lib/local-guard.mjs',
    ]) {
      const source = read(path);
      expect(source).not.toContain("'link'");
      expect(source).not.toContain("'db', 'push'");
      expect(source).not.toContain("'config', 'push'");
    }
  });

  it('documents the boundary and keeps local files ignored', () => {
    const docs = read('docs/local-development.md');
    expect(docs).toContain('Production isolation');
    expect(docs).toContain('npx supabase unlink');
    expect(docs).toContain('db push');
    const checklist = read('docs/production-release-checklist.md');
    expect(checklist).toContain('Production isolation');
    const ignore = read('.gitignore');
    expect(ignore).toContain('.env.*');
  });
});
