import { useCallback, useEffect, useRef, useState } from 'react';
import { checkServiceHealth } from './adminApi';
import { captureHealthFailure } from '../lib/sentry';
import {
  HEALTH_STATUS_MARKERS,
  HEALTH_TONE_CLASSES,
  healthErrorProviders,
  healthStatusLabel,
  newHealthFailures,
  normalizeHealthProviders,
} from './adminHealth';
import { startHealthPolling } from './adminHealthPolling';
import { ADMIN_BUTTON } from './adminUi';

function formatCheckedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString();
}

function overallStatus(providers, checking) {
  if (checking) return 'checking';
  if (providers.some((provider) => provider.status === 'down')) return 'down';
  if (providers.some((provider) => provider.status === 'degraded')) return 'degraded';
  return 'ok';
}

function overallLabel(status, issues) {
  if (status === 'checking') return 'Checking services…';
  if (status === 'ok') return 'All systems healthy';
  return `${issues} service issue${issues === 1 ? '' : 's'}`;
}

// Admin-only monitoring strip (issues #980, #996, #1013). Always shows every
// monitored provider, refreshes every 60s while the tab is visible and keeps
// the one-Sentry-event-per-failure-transition behaviour.
export default function AdminHealthBar({ refreshKey = 0 }) {
  const [providers, setProviders] = useState(() => normalizeHealthProviders(null));
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const previousFailing = useRef(new Set());
  const inFlight = useRef(false);

  const reportFailures = useCallback((nextProviders) => {
    const failures = newHealthFailures(previousFailing.current, nextProviders);
    previousFailing.current = new Set(
      nextProviders.filter((provider) => provider.status !== 'ok').map((provider) => provider.id),
    );
    for (const provider of failures) {
      captureHealthFailure({
        providerId: provider.id,
        providerName: provider.name,
        status: provider.status,
        httpStatus: provider.httpStatus,
      });
    }
  }, []);

  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    setError(null);
    try {
      const payload = await checkServiceHealth();
      const next = normalizeHealthProviders(payload);
      reportFailures(next);
      setProviders(next);
    } catch (cause) {
      const message = String(cause?.message ?? 'Health check failed.');
      const next = healthErrorProviders(message);
      reportFailures(next);
      setProviders(next);
      setError(message);
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, [reportFailures]);

  useEffect(() => {
    const initial = setTimeout(run, 0);
    const poll = startHealthPolling({ run });
    return () => {
      clearTimeout(initial);
      poll.stop();
    };
  }, [run, refreshKey]);

  const status = overallStatus(providers, checking);
  const issues = providers.filter((provider) => provider.status !== 'ok').length;

  return (
    <section
      aria-label="Service monitoring"
      className="mx-auto mt-2 max-w-6xl rounded-xl border border-line bg-raised p-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden="true"
            className={`text-sm ${HEALTH_TONE_CLASSES[status].split(' ').find((cls) => cls.startsWith('text-')) ?? ''}`}
          >
            {HEALTH_STATUS_MARKERS[status]}
          </span>
          <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
            Service monitoring
          </h2>
          <span
            aria-live="polite"
            className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${HEALTH_TONE_CLASSES[status]}`}
          >
            {overallLabel(status, issues)}
          </span>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={checking}
          className={ADMIN_BUTTON.secondary}
        >
          {checking ? 'Checking…' : 'Retry all'}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 rounded border border-alert/50 bg-alert/15 px-2 py-1.5 text-[11px] text-alert-tint">
          Health check failed: {error}
        </p>
      ) : null}

      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => {
          const providerStatus = checking ? 'checking' : provider.status;
          return (
            <li
              key={provider.id}
              className={`rounded-lg border p-2 ${HEALTH_TONE_CLASSES[providerStatus]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <span aria-hidden="true">{HEALTH_STATUS_MARKERS[providerStatus]}</span>
                  {provider.name}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wide">
                  {healthStatusLabel(providerStatus)}
                </span>
              </div>
              <dl className="mt-1 grid grid-cols-3 gap-1 font-mono text-[9px] opacity-90">
                <div>
                  <dt className="uppercase tracking-wide opacity-70">HTTP</dt>
                  <dd>{provider.httpStatus ?? '—'}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide opacity-70">Latency</dt>
                  <dd>{provider.latencyMs == null ? '—' : `${provider.latencyMs} ms`}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide opacity-70">Checked</dt>
                  <dd>{formatCheckedAt(provider.checkedAt)}</dd>
                </div>
              </dl>
              {providerStatus !== 'checking' && provider.status !== 'ok' && provider.detail ? (
                <p className="mt-1 break-words text-[10px] leading-snug">{provider.detail}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
