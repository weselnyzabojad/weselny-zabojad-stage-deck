import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));

describe('issue #918 deterministic local seed', () => {
  it('exposes local:seed and hooks it into reset', () => {
    expect(pkg.scripts['local:seed']).toBe('node scripts/seed-local.mjs');
    const local = read('scripts/local-supabase.mjs');
    expect(local).toContain("run('npm', ['run', 'local:seed'])");
    expect(local).toContain('didReset');
  });

  it('refuses non-local targets and uses stable seed ids', () => {
    const seed = read('scripts/seed-local.mjs');
    expect(seed).toContain('local:seed refuses non-local Supabase targets');
    expect(seed).toContain('assertLocalSupabaseUrl');
    expect(read('scripts/lib/local-guard.mjs')).toContain("'localhost'");
    expect(seed).toContain("ROOM_CODE = 'demo01'");
    expect(seed).toContain("ADMIN_EMAIL = 'owner@local.test'");
    expect(seed).toContain("djIdentityId: 'dj_mark'");
  });

  it('seeds roles, providers, VIP assignment and live state idempotently', () => {
    const seed = read('scripts/seed-local.mjs');
    expect(seed).toContain("from('wedding_roles')");
    expect(seed).toContain("from('wedding_service_providers')");
    expect(seed).toContain("from('live_sync_state')");
    expect(seed).toContain("vip_dj_id: 'dj_mark'");
    expect(seed).toContain("upsert(roleRows, { onConflict: 'wedding_id,role' })");
    expect(seed).toContain("delete().eq('wedding_id', WEDDING_ID)");
  });

  it('creates the local owner only through the auth admin API', () => {
    const seed = read('scripts/seed-local.mjs');
    expect(seed).toContain('auth.admin.createUser');
    expect(seed).toContain('auth.admin.updateUserById');
    expect(seed).toContain("from('app_admins')");
    expect(seed).toContain('bcrypt.hashSync');
  });

  it('documents disposable local credentials and reset behaviour', () => {
    const docs = read('docs/local-development.md');
    expect(docs).toContain('owner@local.test');
    expect(docs).toContain('local-owner-123');
    expect(docs).toContain('demo01');
    expect(docs).toContain('npm run local:seed');
    expect(docs).toContain('disposable local credentials');
  });
});
