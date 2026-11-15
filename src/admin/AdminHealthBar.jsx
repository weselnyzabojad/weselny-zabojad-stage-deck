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

function formatCheckedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

// Admin-only service health bar (issue #980). It runs once when the aal2 admin
// surface mounts and again whenever the header Refresh bumps `refreshKey` or
// the operator presses Retry. No background polling.
export default function AdminHealthBar({ refreshKey = 0 }) {
  const [providers, setProviders] = useState(() => normalizeHealthProviders(null));
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const previousFailing = useRef(new Set());
  const badgeRefs = useRef({});
  const detailsHeadingRef = useRef(null);

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
      setChecking(false);
    }
  }, [reportFailures]);

  useEffect(() => {
    const timer = setTimeout(run, 0);
    return () => clearTimeout(timer);
  }, [run, refreshKey]);

  useEffect(() => {
    if (selectedId) detailsHeadingRef.current?.focus();
  }, [selectedId]);

  const selected = providers.find((provider) => provider.id === selectedId) ?? null;

  function closeDetails() {
    const id = selectedId;
    setSelectedId(null);
    if (id) badgeRefs.current[id]?.focus();
  }

  return (
    <div className="mx-auto mt-2 max-w-6xl">
      <section
        aria-label="Service health"
        className="flex flex-wrap items-center gap-1.5 rounded border border-line bg-raised px-2 py-1.5"
      >
        <span className="mr-1 font-heading text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          Service health
        </span>
        {providers.map((provider) => {
          const status = checking ? 'checking' : provider.status;
          return (
            <button
              key={provider.id}
              ref={(node) => {
                badgeRefs.current[provider.id] = node;
              }}
              type="button"
              onClick={() => setSelectedId(provider.id)}
              aria-label={`${provider.name}: ${healthStatusLabel(status)}${
                provider.httpStatus == null ? '' : `, HTTP ${provider.httpStatus}`
              }. Show details`}
              className={`rounded border px-2 py-1 text-[11px] font-semibold ${HEALTH_TONE_CLASSES[status]}`}
            >
              <span aria-hidden="true" className="mr-1">
                {HEALTH_STATUS_MARKERS[status]}
              </span>
              {provider.name} · {provider.httpStatus ?? '—'}
            </button>
          );
        })}
        {checking ? <span className="text-[11px] text-muted">Checking…</span> : null}
      </section>

      {error ? (
        <p role="alert" className="mt-1 text-[11px] text-red-300">
          Health check failed: {error}
        </p>
      ) : null}

      {selected ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="health-details-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              closeDetails();
            }
          }}
          className="mt-2 rounded border border-line bg-card p-3 text-xs text-ink"
        >
          <div className="flex items-start justify-between gap-3">
            <h3
              id="health-details-title"
              ref={detailsHeadingRef}
              tabIndex={-1}
              className="font-heading text-sm font-bold text-ink"
            >
              {selected.name} health
            </h3>
            <button
              type="button"
              onClick={closeDetails}
              className="rounded border border-line px-2 py-0.5 text-[11px] text-muted"
            >
              Close
            </button>
          </div>
          <dl className="mt-2 grid gap-1 sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted">Status</dt>
            <dd>{healthStatusLabel(selected.status)}</dd>
            <dt className="text-muted">HTTP status</dt>
            <dd>{selected.httpStatus ?? '—'}</dd>
            <dt className="text-muted">Latency</dt>
            <dd>{selected.latencyMs == null ? '—' : `${selected.latencyMs} ms`}</dd>
            <dt className="text-muted">Checked at</dt>
            <dd>{formatCheckedAt(selected.checkedAt)}</dd>
            <dt className="text-muted">Probe</dt>
            <dd>{`service_health · ${selected.id}`}</dd>
            {selected.detail ? (
              <>
                <dt className="text-muted">Detail</dt>
                <dd className="break-words text-red-200">{selected.detail}</dd>
              </>
            ) : null}
          </dl>
          <button
            type="button"
            onClick={run}
            disabled={checking}
            className="mt-3 rounded border border-line-strong bg-raised px-2.5 py-1 font-semibold text-ink disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
