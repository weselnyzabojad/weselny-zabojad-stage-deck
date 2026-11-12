// Single Sentry entry point (issue #794).
//
// Production-only and opt-in: nothing is initialised unless the build is a
// Vite production build with a public `VITE_SENTRY_DSN`. Local dev, demo
// builds and local-only deployments never create a Sentry client or network
// request. Free-tier budget: 10% browser traces and error-only Replay.

import * as Sentry from '@sentry/react';

let initialized = false;

export function isSentryEnabled(env = import.meta.env) {
  return Boolean(env?.PROD && String(env?.VITE_SENTRY_DSN ?? '').trim());
}

export function getSentryConfig(env = import.meta.env) {
  return {
    dsn: String(env.VITE_SENTRY_DSN).trim(),
    environment: env.VITE_SENTRY_ENVIRONMENT || 'production',
    sendDefaultPii: false,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  };
}

export function initSentry(env = import.meta.env, sdk = Sentry) {
  if (initialized) return true;
  if (!isSentryEnabled(env) || typeof window === 'undefined') return false;

  try {
    sdk.init(getSentryConfig(env));
    initialized = true;
    return true;
  } catch {
    return false;
  }
}
