import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServiceHealth, runServiceHealth } from '../supabase/functions/_shared/serviceHealth.js';
import { startServiceMock } from '../tools/service-mock/server.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #979 service health probes', () => {
  let mock;
  let health;

  beforeAll(async () => {
    mock = await startServiceMock({ port: 0 });
    health = createServiceHealth();
  });

  afterAll(async () => {
    await mock.close();
  });

  it('reports Supabase auth and REST health', async () => {
    const ok = await health.probeSupabase({ url: mock.url, serviceKey: 'service-key' });
    expect(ok).toMatchObject({ id: 'supabase', status: 'ok', httpStatus: 200 });
    expect(ok.detail).toBeNull();

    const failing = createServiceHealth({
      fetchImpl: async () => new Response('', { status: 503 }),
    });
    const down = await failing.probeSupabase({
      url: 'http://supabase.test',
      serviceKey: 'service-key',
    });
    expect(down.status).toBe('down');
    expect(down.httpStatus).toBe(503);
  });

  it('probes Sentry through the API without leaking the token', async () => {
    const token = 'super-secret-token';
    const ok = await health.probeSentry({
      apiBase: `${mock.url}/sentry/api/0`,
      orgSlug: 'local',
      projectSlug: 'stage-deck',
      token,
    });
    expect(ok).toMatchObject({ id: 'sentry', status: 'ok', httpStatus: 200 });
    expect(JSON.stringify(ok)).not.toContain(token);

    const missing = await health.probeSentry({
      apiBase: `${mock.url}/sentry/api/0`,
      orgSlug: 'local',
      projectSlug: 'stage-deck',
      token: '',
    });
    expect(missing.status).toBe('down');
    expect(missing.detail).toContain('not configured');
    expect(missing.detail).not.toContain(token);
  });

  it('probes Drive metadata only and maps connector errors', async () => {
    const ok = await health.probeDrive({
      connector: { isConfigured: true, getFileMetadata: async () => ({ id: 'root' }) },
    });
    expect(ok).toMatchObject({ id: 'drive', status: 'ok', httpStatus: 200 });

    const denied = await health.probeDrive({
      connector: {
        isConfigured: true,
        getFileMetadata: async () => {
          const error = new Error('The service account does not have permission.');
          error.status = 403;
          throw error;
        },
      },
    });
    expect(denied).toMatchObject({ status: 'down', httpStatus: 403 });
    expect(denied.detail).toContain('permission');

    const unconfigured = await health.probeDrive({ connector: { isConfigured: false } });
    expect(unconfigured.status).toBe('down');
  });

  it('probes sunset and enforces a timeout', async () => {
    const ok = await health.probeSunset({ url: `${mock.url}/sunset` });
    expect(ok).toMatchObject({ id: 'sunset', status: 'ok', httpStatus: 200 });

    const failed = await health.probeSunset({ url: `${mock.url}/sunset?status=500` });
    expect(failed.status).toBe('down');

    const slow = createServiceHealth({
      timeoutMs: 10,
      fetchImpl: () => new Promise(() => {}),
    });
    const timeout = await slow.probeSunset({ url: 'http://example.test/sunset' });
    expect(timeout.status).toBe('down');
    expect(timeout.detail).toContain('Timed out');
  });

  it('returns all providers even when one fails, with no secrets', async () => {
    const token = 'secret-sentry-token';
    const result = await runServiceHealth({
      health,
      supabase: { url: mock.url, serviceKey: 'service-key' },
      sentry: {
        apiBase: `${mock.url}/sentry/api/0`,
        orgSlug: 'local',
        projectSlug: 'stage-deck',
        token,
      },
      drive: {
        connector: {
          isConfigured: true,
          getFileMetadata: async () => {
            throw new Error('Drive unavailable.');
          },
        },
      },
      sunset: { url: `${mock.url}/sunset?status=500` },
      deck: { url: `${mock.url}/deck?status=503` },
    });

    expect(result.ok).toBe(false);
    expect(result.providers.map((provider) => provider.id)).toEqual([
      'supabase',
      'sentry',
      'drive',
      'sunset',
      'deck',
    ]);
    expect(result.providers.find((provider) => provider.id === 'supabase').status).toBe('ok');
    expect(JSON.stringify(result)).not.toContain(token);
    expect(JSON.stringify(result)).not.toContain('service-key');
  });

  it('probes the production deck URL and maps the Netlify login redirect', async () => {
    const ok = await health.probeDeck({ url: `${mock.url}/deck` });
    expect(ok).toMatchObject({ id: 'deck', status: 'ok', httpStatus: 200 });
    expect(ok.detail).toBeNull();

    const redirect = createServiceHealth({
      fetchImpl: async () => new Response('', { status: 401 }),
    });
    const degraded = await redirect.probeDeck({ url: 'https://deck.example' });
    expect(degraded).toMatchObject({ status: 'degraded', httpStatus: 401 });
    expect(degraded.detail).toContain('Netlify login redirect');

    const failed = await health.probeDeck({ url: `${mock.url}/deck?status=503` });
    expect(failed.status).toBe('down');
    expect(failed.httpStatus).toBe(503);
  });

  it('falls back from HEAD to GET and requires the deck URL', async () => {
    const calls = [];
    const mockHealth = createServiceHealth({
      fetchImpl: async (_url, options) => {
        calls.push(options.method);
        return new Response('', { status: options.method === 'HEAD' ? 405 : 200 });
      },
    });
    const result = await mockHealth.probeDeck({ url: 'https://deck.example' });
    expect(calls).toEqual(['HEAD', 'GET']);
    expect(result.status).toBe('ok');

    const missing = await mockHealth.probeDeck({ url: '' });
    expect(missing.status).toBe('down');
    expect(missing.detail).toContain('not configured');
  });

  it('wires authorization, deployment and local mocks', () => {
    const fn = read('supabase/functions/service_health/index.ts');
    expect(fn).toContain('authorizeAdminSession');
    expect(fn).toContain("from('app_admins')");
    expect(fn).toContain('decodeJwt');
    expect(fn).not.toContain('@sentry');

    const compose = read('docker-compose.local.yml');
    expect(compose).toContain('stage-deck-service-mock');
    expect(compose).toContain('stage-deck-google-drive-mock');

    const local = read('scripts/local-supabase.mjs');
    expect(local).toContain('SENTRY_API_BASE=http://service-mock:8080/sentry/api/0');
    expect(local).toContain('SUNSET_HEALTH_URL=http://service-mock:8080/sunset');
    expect(local).toContain('startLocalMocks');

    const envExample = read('supabase/.env.example');
    expect(envExample).toContain('SENTRY_API_TOKEN=');
    expect(envExample).toContain('SUNSET_HEALTH_URL=');
  });
});
