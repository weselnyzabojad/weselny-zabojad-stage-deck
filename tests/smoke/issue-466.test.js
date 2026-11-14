import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminServiceProviders from '../../src/admin/AdminServiceProviders.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #466 provider role provisioning', () => {
  it('expands role constraints and stage RLS without widening anon access', () => {
    const migration = read('supabase/migrations/202611140001_remove_legacy_photo_role.sql');
    const schema = read('supabase/schema.sql');
    const roles = "'mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'";
    for (const sql of [migration, schema]) {
      expect(sql).toContain(roles);
      expect(sql).not.toContain("'photo', 'photo1'");
    }
    expect(migration).toContain('wedding_roles_role_check');
    expect(migration).toContain('role_sessions_role_check');
    expect(migration).toContain('role_presence_role_check');
    expect(migration).toContain('drop policy if exists "room read"');
    expect(migration).toContain('drop policy if exists "wedding read"');
    expect(migration).not.toContain('to anon');
  });

  it('maps provider categories to stage roles and keeps other contact-only', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("const PROVIDER_ROLE_CATEGORIES = new Set(['dj', 'photo1', 'photo2', 'video', 'venue_manager'])");
    expect(api).toContain('function providerRole(category: string)');
    expect(api).toContain('async function ensureProviderRole');
    expect(api).toContain("return PROVIDER_ROLE_CATEGORIES.has(category) ? category : null");
  });

  it('creates a PIN, preserves existing access, and revokes sessions on removal', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain('const pin = randomPin();');
    expect(api).toContain('bcrypt.hashSync(pin, 10)');
    expect(api).toContain('if (existing) return { role, pin: null, created: false };');
    expect(api).toContain('roleAccess = await ensureProviderRole');
    expect(api).toContain('await revokeProviderRole(admin, weddingId, role)');
    expect(api).toMatch(/\.from\('wedding_roles'\)\s*\.delete\(\)/);
    expect(api).toContain("update({ revoked_at: now })");
    expect(api).toContain("update({ status: 'offline', session_jti: null, last_seen: now })");
    expect(api).toContain('return json({ provider: data, roleAccess });');
  });

  it('lets join_room accept every canonical role without the legacy photo alias', () => {
    const join = read('supabase/functions/join_room/index.ts');
    for (const role of ['mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker']) {
      expect(join).toContain(`'${role}'`);
    }
    expect(join).not.toContain("'photo'");
  });

  it('shows role status, one-time PIN and revoke state in admin', () => {
    const html = renderToStaticMarkup(
      createElement(AdminServiceProviders, {
        wedding: { wedding_id: '2026-08-20_test', roles: ['dj'] },
      }),
    );
    expect(html).toContain('Service providers');
    const source = read('src/admin/AdminServiceProviders.jsx');
    expect(source).toContain('Role access:');
    expect(source).toContain('shown once');
    expect(source).toContain('access revoked');
    expect(source).toContain('Contact only — no app access');
    expect(source).toContain('onChanged?.()');
    expect(read('src/admin/AdminApp.jsx')).toContain('onChanged={load}');
  });
});
