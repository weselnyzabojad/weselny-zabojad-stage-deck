// Single Sentry entry point (issue #794).
//
// Production-only: nothing is initialised outside a Vite production build.
// The public project DSN below is the default so production reporting works
// without extra deploy configuration; `VITE_SENTRY_DSN` overrides it, and an
// explicitly empty value opts out. Local dev, demo builds and local-only
// deployments never create a Sentry client or network request. Free-tier
// budget: 10% browser traces and error-only Replay.

import * as Sentry from '@sentry/react';

// Public browser key, safe to ship. Override per environment via the env var.
const DEFAULT_SENTRY_DSN =
  'https://df558379050185fc0423090d4aff6591@o4512420559716352.ingest.de.sentry.io/4512420575051856';

let initialized = false;

function resolveDsn(env) {
  const configured = env?.VITE_SENTRY_DSN;
  // `undefined` means "not configured" (use the project default); an explicit
  // empty string is an opt-out.
  if (configured === undefined) return DEFAULT_SENTRY_DSN;
  return String(configured).trim();
}

export function isSentryEnabled(env = import.meta.env) {
  return Boolean(env?.PROD && resolveDsn(env));
}

export function getSentryConfig(env = import.meta.env) {
  return {
    dsn: resolveDsn(env),
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

// Reports a caught render error with identifiers only (issue #795). The local
// error log already holds the message/stack for the operator; Sentry must not
// receive cartridge contents, names, PINs, room codes or step titles.
export function captureAppError(
  { error, scope = 'app', role = null, weddingId = null, stepId = null, errorId = null },
  sdk = Sentry,
) {
  if (!initialized) return false;

  const app = Object.fromEntries(
    Object.entries({ role, weddingId, stepId, errorId }).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  );

  try {
    sdk.captureException(error, {
      tags: { scope },
      contexts: { app },
    });
    return true;
  } catch {
    return false;
  }
}
