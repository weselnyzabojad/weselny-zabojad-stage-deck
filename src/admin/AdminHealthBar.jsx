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
import { ADMIN_BUTTON } from './adminUi';

function formatCheckedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function overallStatus(providers, checking) {
  if (checking) return 'checking';
  if (providers.some((provider) => provider.status === 'down')) return 'down';
  if (providers.some((provider) => provider.status === 'degraded')) return 'degraded';
  return 'ok';
}

// Admin-only service health (issue #980, compacted by #996). One System Status
// control replaces the four badges; the dropdown keeps every provider detail.
export default function AdminHealthBar({ refreshKey = 0 }) {
  const [providers, setProviders] = useState(() => normalizeHealthProviders(null));
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const previousFailing = useRef(new Set());
  const buttonRef = useRef(null);
  const headingRef = useRef(null);

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
    if (open) headingRef.current?.focus();
  }, [open]);

  const status = overallStatus(providers, checking);
  const issues = providers.filter((provider) => provider.status !== 'ok').length;

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div className="relative mx-auto mt-2 max-w-6xl">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="system-status-details"
        aria-label={`System status: ${healthStatusLabel(status)}${
          status === 'ok' ? '' : `, ${issues} service issue${issues === 1 ? '' : 's'}`
        }. Show details`}
        className={`${ADMIN_BUTTON.secondary} ${HEALTH_TONE_CLASSES[status]}`}
      >
        <span aria-hidden="true">{HEALTH_STATUS_MARKERS[status]}</span>
        System status
        {status === 'ok' ? null : <span className="font-normal">· {issues} issue{issues === 1 ? '' : 's'}</span>}
      </button>

      {open ? (
        <div
          id="system-status-details"
          role="dialog"
          aria-modal="false"
          aria-labelledby="system-status-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
          className="absolute left-0 z-banner mt-2 w-full max-w-md rounded-xl border border-line bg-card p-3 text-xs text-ink shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <h3
              id="system-status-title"
              ref={headingRef}
              tabIndex={-1}
              className="font-heading text-sm font-bold text-ink"
            >
              System status
            </h3>
            <button type="button" onClick={close} className={ADMIN_BUTTON.ghost}>
              Close
            </button>
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-[11px] text-red-300">
              Health check failed: {error}
            </p>
          ) : null}
          <ul className="mt-2 space-y-1.5">
            {providers.map((provider) => (
              <li
                key={provider.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-line/70 bg-page/60 px-2 py-1"
              >
                <span className="font-semibold">
                  <span aria-hidden="true" className="mr-1">
                    {HEALTH_STATUS_MARKERS[checking ? 'checking' : provider.status]}
                  </span>
                  {provider.name}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {healthStatusLabel(checking ? 'checking' : provider.status)} · HTTP{' '}
                  {provider.httpStatus ?? '—'} · {provider.latencyMs == null ? '—' : `${provider.latencyMs} ms`}
                </span>
                {provider.detail ? (
                  <span className="w-full break-words text-[10px] text-red-200">{provider.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted">
              checked {formatCheckedAt(providers[0]?.checkedAt)}
            </span>
            <button type="button" onClick={run} disabled={checking} className={ADMIN_BUTTON.secondary}>
              Retry
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
