import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #914 admin-managed VIP DJ registry', () => {
  it('creates the registry, seeds both DJs and links providers by foreign key', () => {
    const schema = read('supabase/schema.sql');
    const migration = read('supabase/migrations/202611140004_vip_dj_registry.sql');
    for (const sql of [schema, migration]) {
      expect(sql).toContain('create table if not exists public.vip_djs');
      expect(sql).toContain("'dj_mark'");
      expect(sql).toContain("'dj_szymoniak'");
      expect(sql).toContain('revoke all on');
      expect(sql).toContain('from anon, authenticated');
    }
    expect(migration).toContain('references public.vip_djs(id)');
    expect(migration).toContain('on delete restrict');
  });

  it('exposes audited admin CRUD with assignment and default guards', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    for (const action of ['list_vip_djs', 'upsert_vip_dj', 'deactivate_vip_dj']) {
      expect(api).toContain(`action === '${action}'`);
    }
    expect(api).toContain("writeAudit(admin, allowlisted, 'vip_dj_upsert'");
    expect(api).toContain("writeAudit(admin, allowlisted, 'vip_dj_deactivate'");
    expect(api).toContain('still a package default');
    expect(api).toContain('still assigned to a wedding');
    expect(api).toContain("eq('vip_dj_id', id)");
  });

  it('returns only public fields from the landing projection', () => {
    const fn = read('supabase/functions/public_vip_djs/index.ts');
    expect(fn).toContain("select('id, display_name, logo_url, sort_order')");
    expect(fn).toContain("eq('active', true)");
    expect(fn).not.toContain('phone');
    expect(fn).not.toContain('instagram');
  });

  it('renders the landing partner strip from the registry with a static fallback', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).toContain('FALLBACK_PARTNERS');
    expect(landing).toContain('public_vip_djs');
    expect(landing).toContain('setPartners(active)');
    expect(landing).toContain('src={partner.logoUrl}');
    expect(landing).toContain('alt={partner.displayName}');
  });

  it('resolves the admin logo URL before the bundled fallback', () => {
    const logo = read('src/components/VipDjLogo.jsx');
    expect(logo).toContain('record?.logoUrl');
    expect(logo).toContain('LOGO_BY_ID[djId]');
    expect(logo).toContain('dj = null');
  });

  it('keeps the admin panel editable and using the live registry', () => {
    const panel = read('src/admin/AdminServiceProviders.jsx');
    expect(panel).toContain('listVipDjs');
    expect(panel).toContain('upsertVipDj');
    expect(panel).toContain('deactivateVipDj');
    expect(panel).toContain('vipDjs.filter');
    expect(panel).toContain('VIP DJ registry');
  });
});
