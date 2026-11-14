import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #904 local Supabase scaffolding', () => {
  const docs = read('docs/local-development.md');
  const env = read('supabase/.env.example');
  const config = read('supabase/config.toml');

  it('documents the local start, reset, serve and stop path', () => {
    for (const command of [
      'npx supabase start',
      'npx supabase db reset',
      'npx supabase status',
      'npx supabase functions serve',
      'npx supabase stop',
    ]) {
      expect(docs).toContain(command);
    }
    expect(docs).toContain('http://localhost:5173');
    expect(docs).toContain('http://127.0.0.1:54321');
    expect(docs).toContain('ALLOWED_ORIGIN');
    expect(docs).toContain('public.app_admins');
  });

  it('keeps local function values local-only', () => {
    expect(env).toContain('ALLOWED_ORIGIN=http://localhost:5173');
    expect(env).toContain('SUPABASE_URL=http://127.0.0.1:54321');
    expect(env).not.toContain('https://qdcuxefperykmjlirufe.supabase.co');
    expect(env).not.toContain('https://deck.weselnyzabojad.pl');
    expect(docs).toContain('Never put the production project URL');
  });

  it('does not commit real secrets', () => {
    for (const text of [docs, env]) {
      expect(text).not.toMatch(/sb_secret_[A-Za-z0-9]/);
      expect(text).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
      expect(text).not.toMatch(/eyJhbGciOiJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./);
    }
  });

  it('keeps production configuration untouched', () => {
    expect(config).toContain('project_id = "stage-deck"');
    expect(config).toContain('enable_signup = false');
    expect(read('scripts/check-production-origin.mjs')).toContain(
      'https://deck.weselnyzabojad.pl',
    );
  });
});
