import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getSyncConfig } from '../../src/lib/sync/syncConfig.js';
import { validateEnv } from '../../scripts/validate-env.mjs';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

const SUPABASE_ENV = {
  VITE_SUPABASE_URL: 'https://project-ref.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl',
};

describe('issue #797 fail closed on production deck mode', () => {
  it('defaults production builds to production mode', () => {
    const config = getSyncConfig({ ...SUPABASE_ENV, PROD: true });
    expect(config.deckMode).toBe('production');
    expect(config.isProduction).toBe(true);
  });

  it('keeps development builds local by default', () => {
    expect(getSyncConfig({ ...SUPABASE_ENV, PROD: false }).deckMode).toBe('local');
    expect(getSyncConfig({ ...SUPABASE_ENV }).deckMode).toBe('local');
  });

  it('only allows an explicit local opt-out for demo builds', () => {
    expect(
      getSyncConfig({ ...SUPABASE_ENV, PROD: true, VITE_DECK_MODE: 'local' }).deckMode,
    ).toBe('local');
    expect(
      getSyncConfig({ ...SUPABASE_ENV, PROD: true, VITE_DECK_MODE: 'production' }).deckMode,
    ).toBe('production');
    expect(
      getSyncConfig({ ...SUPABASE_ENV, PROD: true, VITE_DECK_MODE: 'demo' }).deckMode,
    ).toBe('production');
  });

  it('requires production mode when validating a production deploy', () => {
    expect(
      validateEnv(SUPABASE_ENV, { allowMissing: true, requireProduction: true }).errors.join(' '),
    ).toContain('VITE_DECK_MODE=production');

    expect(
      validateEnv(
        { ...SUPABASE_ENV, VITE_DECK_MODE: 'production' },
        { allowMissing: true, requireProduction: true },
      ).errors,
    ).toEqual([]);
  });

  it('wires the production deploy guard without affecting local builds', () => {
    const netlify = read('netlify.toml');
    const script = read('scripts/deploy-build.mjs');
    expect(netlify).toContain('command = "node scripts/deploy-build.mjs"');
    expect(script).toContain("process.env.CONTEXT === 'production'");
    expect(script).toContain('requireProduction: true');
    expect(script).toContain('await build()');
  });

  it('documents the fail-closed rule', () => {
    expect(read('.env.example')).toMatch(/fail closed/i);
    expect(read('README.md')).toMatch(/fail closed/i);
  });
});
