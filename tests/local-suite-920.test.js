import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));

describe('issue #920 local integration suite', () => {
  it('keeps the default suite hermetic and the local suite opt-in', () => {
    expect(pkg.scripts['test:local']).toBe('node scripts/test-local.mjs');
    const config = read('vitest.config.js');
    expect(config).toContain("exclude: ['tests/local/**']");
    const local = read('vitest.local.config.js');
    expect(local).toContain("include: ['tests/local/**/*.test.js']");
  });

  it('guards the local runner and starts prerequisites with clear failures', () => {
    const runner = read('scripts/test-local.mjs');
    expect(runner).toContain('assertLocalSupabaseUrl');
    expect(runner).toContain("run('npm', ['run', 'local:start'])");
    expect(runner).toContain('Local Supabase is not running');
    expect(runner).toContain('Edge Functions are unavailable');
    expect(runner).toContain('local:start');
  });

  it('covers database, RLS and Edge Function contracts', () => {
    const test = read('tests/local/local-integration.test.js');
    for (const contract of [
      'seeded wedding',
      'denies anon access',
      'joined role read only its own room',
      'join_room',
      'submit_song_request',
      'get_song_request_status',
      'reveal_speech_key',
      'rejects a wrong PIN',
    ]) {
      expect(test).toContain(contract);
    }
  });

  it('documents the tiers and never uses hosted credentials', () => {
    const docs = read('docs/testing.md');
    expect(docs).toContain('Local integration');
    expect(docs).toContain('npm run test:local');
    expect(docs).toContain('Docker');
    const runner = read('scripts/test-local.mjs');
    expect(runner).toContain('LOCAL_SUPABASE_SERVICE_ROLE_KEY');
    expect(runner).not.toContain('supabase.co');
  });
});
