import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HEALTH_PROVIDERS } from '../supabase/functions/_shared/serviceHealth.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1029 Netlify site health probe', () => {
  it('wires the Netlify site secrets server-side only', () => {
    const fn = read('supabase/functions/service_health/index.ts');
    expect(fn).toContain("envOr('NETLIFY_API_BASE', 'https://api.netlify.com/api/v1')");
    expect(fn).toContain("Deno.env.get('NETLIFY_SITE_ID')");
    expect(fn).toContain("Deno.env.get('NETLIFY_API_TOKEN')");

    const env = read('supabase/.env.example');
    expect(env).toContain('NETLIFY_API_TOKEN=');
    expect(env).toContain('NETLIFY_SITE_ID=');
    const docs = read('docs/admin-setup-and-secrets.md');
    expect(docs).toContain('NETLIFY_API_TOKEN');
    expect(docs).toContain('NETLIFY_SITE_ID');
  });

  it('adds the Netlify card and keeps 12 providers', () => {
    const health = read('src/admin/adminHealth.js');
    expect(health).toContain("id: 'netlify'");
    expect(health).toContain("name: 'Netlify'");
    expect(HEALTH_PROVIDERS).toHaveLength(12);
    expect(HEALTH_PROVIDERS).toContain('netlify');
    expect(HEALTH_PROVIDERS).toContain('itunes');
    expect(HEALTH_PROVIDERS).toContain('musicbrainz');
  });

  it('supports Bearer auth, deploy state and status overrides in the mock', () => {
    const mock = read('tools/service-mock/server.mjs');
    expect(mock).toContain('/netlify');
    expect(mock).toContain('published_deploy');
    expect(mock).toContain("url.searchParams.get('deploy')");
  });
});
