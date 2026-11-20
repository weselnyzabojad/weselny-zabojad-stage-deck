import { useCallback, useEffect, useRef, useState } from 'react';
import { checkServiceHealth } from './adminApi';
import { captureHealthFailure } from '../lib/sentry';
import {
  HEALTH_DOT_CLASSES,
  HEALTH_TONE_CLASSES,
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
} from './adminHealth';
import { startHealthPolling } from './adminHealthPolling';
import { ADMIN_BUTTON } from './adminUi';

function formatCheckedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function pillTitle(provider) {
  const latency = provider.latencyMs == null ? 'latency —' : `${provider.latencyMs} ms`;
  return `${provider.name} · ${latency} · checked ${formatCheckedAt(provider.checkedAt)}`;
}

function pillClasses(tone, active) {
  const base =
    'inline-flex max-w-[190px] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition';
  const state = HEALTH_TONE_CLASSES[tone] ?? HEALTH_TONE_CLASSES.checking;
  return `${base} ${state} ${active ? 'ring-1 ring-monitor-accent' : ''}`;
}

function summaryClasses(tone) {
  return HEALTH_TONE_CLASSES[tone] ?? HEALTH_TONE_CLASSES.checking;
}

// Admin-only monitoring strip (issues #980, #996, #1013, #1284). It always
// shows every monitored provider, refreshes every 60s while the tab is visible
// and keeps the one-Sentry-event-per-failure-transition behaviour.
export default function AdminHealthBar({ refreshKey = 0 }) {
  const [providers, setProviders] = useState(() => normalizeHealthProviders(null));
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [open, setOpen] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const previousFailing = useRef(new Set());
  const inFlight = useRef(false);
  const providersRef = useRef(providers);

  useEffect(() => {
    providersRef.current = providers;
  }, [providers]);

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
      providersRef.current = next;
      reportFailures(next);
      setProviders(next);
    } catch (cause) {
      const message = String(cause?.message ?? 'Health check failed.');
      const next = healthErrorProviders(message);
      providersRef.current = next;
      reportFailures(next);
      setProviders(next);
      setError(message);
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, [reportFailures]);

  const retryProvider = useCallback(
    async (providerId) => {
      if (!providerId || checking || retryingId) return;
      setRetryingId(providerId);
      try {
        const payload = await checkServiceHealth({ providerId });
        const raw = Array.isArray(payload?.providers)
          ? payload.providers.find((provider) => provider.id === providerId)
          : null;
        const next = normalizeHealthProvider(raw);
        if (!next) throw new Error(`${providerId} returned no health result.`);
        const merged = mergeHealthProvider(providersRef.current, next);
        providersRef.current = merged;
        reportFailures(merged);
        setProviders(merged);
        setError(null);
      } catch (cause) {
        const message = String(cause?.message ?? 'Health check failed.');
        const fallback = healthProviderFallback(
          providerId,
          message,
          new Date().toISOString(),
        );
        const merged = mergeHealthProvider(providersRef.current, fallback);
        providersRef.current = merged;
        reportFailures(merged);
        setProviders(merged);
        setError(message);
      } finally {
        setRetryingId(null);
      }
    },
    [checking, reportFailures, retryingId],
  );

  useEffect(() => {
    const initial = setTimeout(run, 0);
    const poll = startHealthPolling({ run });
    return () => {
      clearTimeout(initial);
      poll.stop();
    };
  }, [run, refreshKey]);

  const status = healthOverallStatus(providers, checking);
  const issues = providers.filter((provider) => provider.status !== 'ok').length;
  const summaryTone = error ? 'down' : status;
  const summary = healthSummaryLabel({
    status,
    issues,
    offline: Boolean(error),
    checking,
  });
  const selectedProvider = providers.find((provider) => provider.id === selectedId) ?? null;

  const toggleDetails = () => {
    setOpen((current) => {
      const next = !current;
      if (next && !selectedId) {
        const firstIssue = providers.find((provider) => provider.status !== 'ok');
        setSelectedId(firstIssue?.id ?? providers[0]?.id ?? null);
      }
      return next;
    });
  };

  const selectProvider = (providerId) => {
    setSelectedId(providerId);
    setOpen((current) => (selectedId === providerId ? !current : true));
  };

  return (
    <section aria-label="Service monitoring" className="mx-auto mt-2 max-w-6xl">
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-2xl border border-monitor-border bg-monitor-surface px-2 py-1.5">
        <span
          aria-live="polite"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${summaryClasses(summaryTone)}`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              HEALTH_DOT_CLASSES[summaryTone] ?? HEALTH_DOT_CLASSES.checking
            }`}
          />
          {summary}
        </span>

        <ul
          aria-label="Monitored services"
          className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
        >
          {providers.map((provider) => {
            const providerChecking = checking || retryingId === provider.id;
            const tone = healthPillTone(provider, providerChecking);
            const code = healthPillCode(provider, providerChecking);
            const active = open && selectedId === provider.id;
            return (
              <li key={provider.id}>
                <button
                  type="button"
                  onClick={() => selectProvider(provider.id)}
                  title={pillTitle(provider)}
                  aria-label={`${provider.name}: ${healthStatusLabel(provider.status)} HTTP ${code}`}
                  aria-expanded={active}
                  aria-controls="admin-health-detail"
                  className={pillClasses(tone, active)}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      HEALTH_DOT_CLASSES[tone] ?? HEALTH_DOT_CLASSES.checking
                    }`}
                  />
                  <span className="truncate">{provider.name}</span>
                  <span
                    className={`shrink-0 font-mono font-bold ${
                      tone === 'down' ? 'text-monitor-error-text' : 'opacity-80'
                    }`}
                  >
                    {code}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void run()}
            disabled={checking}
            className={`${ADMIN_BUTTON.secondary} px-2 py-0.5 text-[10px]`}
          >
            {checking ? 'Checking…' : 'Retry all'}
          </button>
          <button
            type="button"
            onClick={toggleDetails}
            aria-expanded={open}
            aria-controls="admin-health-detail"
            aria-label={open ? 'Hide service details' : 'Show service details'}
            className={`${ADMIN_BUTTON.ghost} px-1.5 py-0.5 text-xs`}
          >
            <span aria-hidden="true">{open ? '▴' : '▾'}</span>
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-monitor-error-border bg-monitor-error-bg px-2 py-1.5 text-[11px] text-monitor-error-text"
        >
          <span className="min-w-0 break-words">Health check failed: {error}</span>
          <button
            type="button"
            onClick={() => void run()}
            disabled={checking}
            className={`${ADMIN_BUTTON.secondary} px-2 py-0.5 text-[10px]`}
          >
            Retry
          </button>
        </div>
      ) : null}

      {open && selectedProvider ? (
        <div
          id="admin-health-detail"
          role="region"
          aria-label={`${selectedProvider.name} service details`}
          className="mt-1.5 rounded-2xl border border-monitor-border bg-monitor-surface p-3 text-xs"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-heading text-sm font-bold text-monitor-ink">{selectedProvider.name}</h3>
              {selectedProvider.url ? (
                <a
                  href={selectedProvider.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block break-all font-mono text-[10px] text-monitor-accent-ink underline decoration-dotted"
                >
                  {selectedProvider.url}
                </a>
              ) : (
                <span className="mt-0.5 block font-mono text-[10px] text-monitor-muted">
                  No public URL
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => void retryProvider(selectedProvider.id)}
              disabled={checking || Boolean(retryingId)}
              className={`${ADMIN_BUTTON.secondary} px-2 py-0.5 text-[10px]`}
            >
              {retryingId === selectedProvider.id ? 'Retrying…' : 'Retry'}
            </button>
          </div>

          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <dt className="text-[9px] uppercase tracking-wide text-monitor-muted">HTTP</dt>
              <dd className="font-mono text-[11px] font-semibold text-monitor-ink">
                {selectedProvider.httpStatus ?? '—'}
                {selectedProvider.statusText ? ` ${selectedProvider.statusText}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-wide text-monitor-muted">Latency</dt>
              <dd className="font-mono text-[11px] font-semibold text-monitor-ink">
                {selectedProvider.latencyMs == null ? '—' : `${selectedProvider.latencyMs} ms`}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-wide text-monitor-muted">Checked</dt>
              <dd className="font-mono text-[11px] font-semibold text-monitor-ink">
                {formatCheckedAt(selectedProvider.checkedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-wide text-monitor-muted">State</dt>
              <dd className="text-[11px] font-semibold text-monitor-ink">
                {healthStatusLabel(selectedProvider.status)}
              </dd>
            </div>
          </dl>

          <p className="mt-2 break-words rounded-lg border border-monitor-border bg-monitor-surface-muted px-2 py-1.5 text-[10px] leading-snug text-monitor-muted">
            {selectedProvider.detail || 'No error detail returned.'}
          </p>
        </div>
      ) : null}
    </section>
  );
}
