import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkAdminBackend } from '../../src/admin/adminApi.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const env = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' };

afterEach(() => vi.unstubAllGlobals());

describe('issue #372 admin backend preflight and read-only mode', () => {
  it('reports misconfiguration as read-only', async () => {
    const result = await checkAdminBackend({});
    expect(result).toMatchObject({ ok: false, readOnly: true, configured: false });
  });

  it('marks a missing Edge Function as read-only', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => new Response('', { status: url.endsWith('admin_drive') ? 404 : 200 })));
    const result = await checkAdminBackend(env);
    expect(result.ok).toBe(false);
    expect(result.readOnly).toBe(true);
    expect(result.adminDrive.ok).toBe(false);
    expect(result.reason).toContain('admin_drive');
  });

  it('treats unreachable endpoints as read-only', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const result = await checkAdminBackend(env);
    expect(result.readOnly).toBe(true);
    expect(result.adminApi.error).toContain('Failed to fetch');
  });

  it('wraps endpoint-specific network errors in adminApi', () => {
    const source = read('src/admin/adminApi.js');
    expect(source).toContain('adminEndpointError');
    expect(source).toContain('Could not reach');
    expect(source).toContain('fetchAdminEndpoint');
  });

  it('renders read-only mode and disables mutations', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('Read-only mode');
    expect(app).toContain('guardReadOnly');
    expect(app).toContain('disabled={readOnly}');
    expect(app).toContain('readOnly={readOnly}');
    expect(read('src/admin/AdminDrivePanel.jsx')).toContain('readOnly || !targetWedding');
  });

  it('fails closed on the server and exposes Drive status', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain('admin_read_only');
    expect(api).toContain('REQUIRED_ADMIN_ENV');
    expect(read('supabase/functions/admin_drive/index.ts')).toContain("action === 'status'");
  });

  it('documents deployment and read-only behaviour', () => {
    const readme = read('README.md');
    expect(readme).toContain('supabase functions deploy admin_drive');
    expect(readme).toContain('ALLOWED_ORIGIN=http://localhost:5173');
    expect(readme).toContain('read-only mode');
  });
});
