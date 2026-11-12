import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { OPTIONAL_CLIENT_VARS } from '../../scripts/validate-env.mjs';
import { getSentryConfig, initSentry, isSentryEnabled } from '../../src/lib/sentry.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

const PROD_ENV = {
  PROD: true,
  VITE_SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
  VITE_SENTRY_ENVIRONMENT: 'production',
};

describe('issue #794 Sentry initialisation', () => {
  it('enables Sentry only in production builds with a DSN', () => {
    expect(isSentryEnabled(PROD_ENV)).toBe(true);
    expect(isSentryEnabled({ ...PROD_ENV, PROD: false })).toBe(false);
    expect(isSentryEnabled({ ...PROD_ENV, VITE_SENTRY_DSN: '' })).toBe(false);
    expect(isSentryEnabled({ ...PROD_ENV, VITE_SENTRY_DSN: '   ' })).toBe(false);
    expect(isSentryEnabled(undefined)).toBe(false);
  });

  it('builds a privacy-safe free-tier configuration', () => {
    const config = getSentryConfig(PROD_ENV);
    expect(config.dsn).toBe(PROD_ENV.VITE_SENTRY_DSN);
    expect(config.environment).toBe('production');
    expect(config.sendDefaultPii).toBe(false);
    expect(config.tracesSampleRate).toBe(0.1);
    expect(config.replaysSessionSampleRate).toBe(0);
    expect(config.replaysOnErrorSampleRate).toBe(1);
    expect(config.integrations).toHaveLength(2);
    expect(getSentryConfig({ ...PROD_ENV, VITE_SENTRY_ENVIRONMENT: 'staging' }).environment).toBe(
      'staging',
    );
  });

  it('never initialises without a window or without production configuration', () => {
    const sdk = { init: vi.fn() };
    expect(initSentry(PROD_ENV, sdk)).toBe(false);
    expect(sdk.init).not.toHaveBeenCalled();

    vi.stubGlobal('window', {});
    try {
      expect(initSentry({ ...PROD_ENV, PROD: false }, sdk)).toBe(false);
      expect(initSentry({ ...PROD_ENV, VITE_SENTRY_DSN: '' }, sdk)).toBe(false);
      expect(sdk.init).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('initialises once and stays idempotent in production', () => {
    vi.stubGlobal('window', {});
    try {
      const sdk = { init: vi.fn() };
      expect(initSentry(PROD_ENV, sdk)).toBe(true);
      expect(initSentry(PROD_ENV, sdk)).toBe(true);
      expect(sdk.init).toHaveBeenCalledTimes(1);
      expect(sdk.init.mock.calls[0][0].sendDefaultPii).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('initialises in main before the app renders', () => {
    const main = read('src/main.jsx');
    expect(main).toContain("import { initSentry } from './lib/sentry.js'");
    expect(main.indexOf('initSentry()')).toBeGreaterThan(-1);
    expect(main.indexOf('initSentry()')).toBeLessThan(main.indexOf('createRoot('));
    expect(main).not.toContain("from '@sentry/react'");
  });

  it('documents both public variables as optional client configuration', () => {
    const example = read('.env.example');
    expect(example).toContain('VITE_SENTRY_DSN=');
    expect(example).toContain('VITE_SENTRY_ENVIRONMENT=');
    expect(example).toMatch(/public/);
    expect(OPTIONAL_CLIENT_VARS).toHaveProperty('VITE_SENTRY_DSN');
    expect(OPTIONAL_CLIENT_VARS).toHaveProperty('VITE_SENTRY_ENVIRONMENT');
  });
});
