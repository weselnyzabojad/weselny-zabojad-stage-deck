import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HEALTH_PROVIDER_ORDER,
  healthErrorProviders,
  healthStatusLabel,
  newHealthFailures,
  normalizeHealthProviders,
} from '../src/admin/adminHealth.js';
import { captureHealthFailure } from '../src/lib/sentry.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const provider = (id, status, extra = {}) => ({
  id,
  name: id,
  status,
  httpStatus: status === 'ok' ? 200 : 502,
  latencyMs: 12,
  checkedAt: '2026-11-15T10:00:00.000Z',
  detail: null,
  ...extra,
});

describe('issue #980 admin health bar', () => {
  it('normalizes a healthy payload in provider order', () => {
    const providers = normalizeHealthProviders({
      providers: HEALTH_PROVIDER_ORDER.map(({ id }) => provider(id, 'ok')),
    });
    expect(providers.map((entry) => entry.id)).toEqual(['supabase', 'sentry', 'drive', 'sunset', 'deck', 'netlify']);
    expect(providers.every((entry) => entry.status === 'ok')).toBe(true);
  });

  it('keeps degraded and down states and fills missing providers', () => {
    const providers = normalizeHealthProviders({
      providers: [provider('supabase', 'degraded'), provider('sentry', 'down')],
    });
    expect(providers.find((entry) => entry.id === 'supabase').status).toBe('degraded');
    expect(providers.find((entry) => entry.id === 'sentry').status).toBe('down');
    expect(providers.find((entry) => entry.id === 'drive').status).toBe('down');
    expect(providers.find((entry) => entry.id === 'drive').detail).toContain('No result');
  });

  it('reports only new failing transitions, including the first check', () => {
    const healthy = HEALTH_PROVIDER_ORDER.map(({ id }) => provider(id, 'ok'));
    const oneDown = healthy.map((entry) =>
      entry.id === 'drive' ? provider('drive', 'down') : entry,
    );

    const first = newHealthFailures(new Set(), oneDown);
    expect(first.map((entry) => entry.id)).toEqual(['drive']);

    const repeated = newHealthFailures(new Set(['drive']), oneDown);
    expect(repeated).toEqual([]);

    const recovered = healthy.map((entry) => provider(entry.id, 'ok'));
    expect(newHealthFailures(new Set(), recovered)).toEqual([]);

    const sentryDown = healthy.map((entry) =>
      entry.id === 'sentry' ? provider('sentry', 'degraded') : entry,
    );
    expect(newHealthFailures(new Set(['drive']), sentryDown).map((entry) => entry.id)).toEqual([
      'sentry',
    ]);
  });

  it('turns a failed health call into four down providers', () => {
    const providers = healthErrorProviders('Failed to fetch');
    expect(providers).toHaveLength(6);
    expect(providers.every((entry) => entry.status === 'down')).toBe(true);
    expect(providers.every((entry) => entry.detail === 'Failed to fetch')).toBe(true);
  });

  it('labels every status', () => {
    expect(healthStatusLabel('ok')).toBe('Healthy');
    expect(healthStatusLabel('degraded')).toBe('Degraded');
    expect(healthStatusLabel('down')).toBe('Down');
    expect(healthStatusLabel('checking')).toBe('Checking');
  });

  it('stays silent in local dev because Sentry is production-only', () => {
    expect(captureHealthFailure({ providerId: 'drive', status: 'down', httpStatus: 403 })).toBe(
      false,
    );
    const sentry = read('src/lib/sentry.js');
    expect(sentry).toContain('export function captureHealthFailure');
    expect(sentry).toContain("scope: 'admin_health'");
    expect(sentry).toContain('if (!initialized');
    expect(sentry).toContain('env?.PROD');
  });

  it('uses the probe endpoint and renders the monitoring bar before the admin tabs', () => {
    const api = read('src/admin/adminApi.js');
    expect(api).toContain('/service_health');
    expect(api).toContain('Authorization: `Bearer ${session.access_token}`');

    const bar = read('src/admin/AdminHealthBar.jsx');
    expect(bar).toContain('checkServiceHealth');
    expect(bar).toContain('captureHealthFailure');
    expect(bar).toContain('aria-label="Service monitoring"');
    expect(bar).toContain('Retry all');
    expect(bar).toContain('sm:grid-cols-2 xl:grid-cols-3');
    expect(bar).not.toContain('role="dialog"');

    const app = read('src/admin/AdminApp.jsx');
    const headerRender = app.slice(app.indexOf('<AdminHealthBar'), app.indexOf('<nav'));
    expect(headerRender).toContain('AdminHealthBar');
    expect(app).toContain('healthRefresh');
  });
});
