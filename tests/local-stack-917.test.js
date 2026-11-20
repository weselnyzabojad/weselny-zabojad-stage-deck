import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));

describe('issue #917 local Supabase automation', () => {
  it('exposes the one-command local scripts', () => {
    expect(pkg.scripts['local:start']).toBe('node scripts/local-supabase.mjs start');
    expect(pkg.scripts['local:stop']).toBe('node scripts/local-supabase.mjs stop');
    expect(pkg.scripts['local:status']).toBe('node scripts/local-supabase.mjs status');
    expect(pkg.scripts['local:reset']).toBe('node scripts/local-supabase.mjs reset');
  });

  it('manages the temporary baseline with a finally cleanup', () => {
    const script = read('scripts/local-supabase.mjs');
    expect(script).toContain("'00000000000000_base_schema.sql'");
    expect(script).toContain('createBaseline()');
    expect(script).toContain('finally {');
    expect(script).toContain('removeBaseline()');
    expect(script).toContain("run('npx', ['supabase', 'db', 'reset'])");
    expect(existsSync(new URL('../supabase/migrations/00000000000000_base_schema.sql', import.meta.url))).toBe(false);
  });

  it('keeps the temporary baseline and env files out of git', () => {
    const ignore = read('.gitignore');
    expect(ignore).toContain('supabase/migrations/00000000000000_base_schema.sql');
    expect(ignore).toContain('.env.*');
  });

  it('writes local-only client and server env files', () => {
    const script = read('scripts/local-supabase.mjs');
    expect(script).toContain('VITE_SUPABASE_URL=');
    expect(script).toContain('VITE_DECK_MODE=local');
    expect(script).toContain('SUPABASE_SERVICE_ROLE_KEY=');
    expect(script).toContain('DECK_SUPABASE_JWT_PRIVATE_KEY=');
    expect(script).toContain('SPEECH_SECRET_MASTER_KEY=');
    expect(script).toContain('Docker is unavailable');
  });

  it('documents the automated start, reset, status and logs workflow', () => {
    const docs = read('docs/local-development.md');
    expect(docs).toContain('npm run local:start');
    expect(docs).toContain('npm run local:reset');
    expect(docs).toContain('npm run local:status');
    expect(docs).toContain('npm run local:stop');
    expect(docs).toContain('supabase/.env.local');
    expect(docs).toContain('00000000000000_base_schema.sql');
    expect(docs).not.toContain('cp supabase/schema.sql');
  });
});
