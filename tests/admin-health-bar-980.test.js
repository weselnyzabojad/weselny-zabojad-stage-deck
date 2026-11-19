import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HEALTH_PROVIDER_ORDER,
  healthErrorProviders,
  healthOverallStatus,
  healthPillCode,
  healthPillTone,
  healthProviderFallback,
  healthStatusLabel,
  healthSummaryLabel,
  mergeHealthProvider,
  newHealthFailures,
  normalizeHealthProvider,
  normalizeHealthProviders,
} from '../src/admin/adminHealth.js';
import { captureHealthFailure } from '../src/lib/sentry.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const provider = (id, status, extra = {}) => ({
  id,
  name: id,
  status,
  httpStatus: status === 'ok' ? 200 : 502,
  statusText: status === 'ok' ? 'OK' : 'Bad Gateway',
  latencyMs: 12,
  checkedAt: '2026-11-15T10:00:00.000Z',
  detail: null,
  url: `https://example.test/${id}`,
  ...extra,
});

describe('issue #980 admin health bar', () => {
  it('normalizes a healthy payload in 12-provider order', () => {
    const providers = normalizeHealthProviders({
      providers: HEALTH_PROVIDER_ORDER.map(({ id }) => provider(id, 'ok')),
    });
    expect(providers.map((entry) => entry.id)).toEqual([
      'supabase',
      'sentry',
      'drive',
      'sunset',
      'deck',
      'netlify',
      'main_site',
      'landing_banner',
      'deck_site',
      'francuski_dj',
      'itunes',
      'musicbrainz',
    ]);
    expect(providers.every((entry) => entry.status === 'ok')).toBe(true);
    expect(providers.find((entry) => entry.id === 'itunes').statusText).toBe('OK');
    expect(providers.find((entry) => entry.id === 'itunes').url).toBe(
      'https://example.test/itunes',
    );
  });

  it('keeps degraded and down states and fills missing providers', () => {
    const providers = normalizeHealthProviders({
      providers: [provider('supabase', 'degraded'), provider('sentry', 'down')],
    });
    expect(providers.find((entry) => entry.id === 'supabase').status).toBe('degraded');
    expect(providers.find((entry) => entry.id === 'sentry').status).toBe('down');
    expect(providers.find((entry) => entry.id === 'drive').status).toBe('down');
    expect(providers.find((entry) => entry.id === 'drive').detail).toContain('No result');
    expect(providers.find((entry) => entry.id === 'drive').url).toBeNull();
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

  it('turns a failed health call into 12 down providers', () => {
    const providers = healthErrorProviders('Failed to fetch');
    expect(providers).toHaveLength(12);
    expect(providers.every((entry) => entry.status === 'down')).toBe(true);
    expect(providers.every((entry) => entry.detail === 'Failed to fetch')).toBe(true);
    expect(providers.every((entry) => entry.httpStatus === null)).toBe(true);
  });

  it('derives the compact pill and summary states', () => {
    expect(healthPillTone(provider('supabase', 'ok'))).toBe('ok');
    expect(healthPillTone(provider('supabase', 'degraded'))).toBe('down');
    expect(healthPillTone(provider('supabase', 'ok'), true)).toBe('checking');
    expect(healthPillCode(provider('supabase', 'ok'))).toBe('200');
    expect(healthPillCode(provider('supabase', 'down'))).toBe('502');
    expect(healthPillCode(provider('supabase', 'down', { httpStatus: null }))).toBe('ERR');
    expect(healthPillCode(provider('supabase', 'down'), true)).toBe('…');

    expect(healthSummaryLabel({ status: 'ok', issues: 0 })).toBe('All systems OK');
    expect(healthSummaryLabel({ status: 'down', issues: 2 })).toBe('2 issues');
    expect(healthSummaryLabel({ status: 'down', issues: 1 })).toBe('1 issue');
    expect(healthSummaryLabel({ status: 'down', issues: 1, offline: true })).toBe(
      'Health check offline',
    );
    expect(healthSummaryLabel({ status: 'checking', issues: 0 })).toBe('Checking services…');
    expect(healthOverallStatus([], true)).toBe('checking');
    expect(healthOverallStatus([provider('a', 'ok')])).toBe('ok');
    expect(healthOverallStatus([provider('a', 'degraded')])).toBe('degraded');
    expect(healthOverallStatus([provider('a', 'down')])).toBe('down');
  });

  it('normalizes and merges a single provider retry', () => {
    const initial = normalizeHealthProviders(null);
    const next = normalizeHealthProvider(provider('itunes', 'ok'));
    const merged = mergeHealthProvider(initial, next);
    expect(merged).toHaveLength(12);
    expect(merged.find((entry) => entry.id === 'itunes')).toMatchObject({
      status: 'ok',
      httpStatus: 200,
    });
    expect(merged.find((entry) => entry.id === 'supabase').status).toBe('down');

    const fallback = healthProviderFallback('itunes', 'Failed to fetch');
    expect(fallback).toMatchObject({ id: 'itunes', status: 'down', detail: 'Failed to fetch' });
    expect(healthProviderFallback('bogus', 'nope')).toBeNull();
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

  it('renders the compact strip, proxy alert and diagnostic drawer before the admin tabs', () => {
    const api = read('src/admin/adminApi.js');
    expect(api).toContain('/service_health');
    expect(api).toContain('checkServiceHealth({ providerId = null } = {})');
    expect(api).toContain('providerId ? { providerId } : {}');

    const bar = read('src/admin/AdminHealthBar.jsx');
    expect(bar).toContain('aria-label="Service monitoring"');
    expect(bar).toContain('healthPillTone');
    expect(bar).toContain('healthPillCode');
    expect(bar).toContain('title={pillTitle(provider)}');
    expect(bar).toContain('motion-reduce:animate-none');
    expect(bar).toContain('id="admin-health-detail"');
    expect(bar).toContain('checkServiceHealth({ providerId })');
    expect(bar).toContain('Health check failed:');
    expect(bar).toContain('Retry all');
    expect(bar).toContain('Retry');
    expect(bar).toContain('ADMIN_BUTTON.secondary');
    expect(bar).toContain('ADMIN_BUTTON.ghost');
    expect(bar).not.toContain('role="dialog"');
    expect(bar).not.toContain('sm:grid-cols-2 xl:grid-cols-3');

    const app = read('src/admin/AdminApp.jsx');
    const headerRender = app.slice(app.indexOf('<AdminHealthBar'), app.indexOf('<nav'));
    expect(headerRender).toContain('AdminHealthBar');
    expect(app).toContain('healthRefresh');
  });
});
