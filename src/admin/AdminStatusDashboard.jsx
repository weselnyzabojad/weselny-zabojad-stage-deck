import { HEALTH_PROVIDER_ORDER, HEALTH_STATUS_MARKERS } from './adminHealth';
import { isMonitorStandalone } from '../lib/monitorPwa';

const STANDALONE = isMonitorStandalone({
  matchMedia: typeof window === 'undefined' ? null : window.matchMedia?.bind(window),
  navigator: typeof navigator === 'undefined' ? null : navigator,
  search: typeof window === 'undefined' ? '' : window.location.search,
});

export default function AdminStatusDashboard() {
  return (
    <section
      aria-label="Wedding Monitor"
      data-standalone={STANDALONE ? 'true' : 'false'}
      className="rounded-2xl border border-monitor-border bg-monitor-surface p-4 text-monitor-ink"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-bold text-monitor-ink">Service monitor</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-monitor-muted">
            The strip above refreshes every 60 seconds while this app is visible. Select any
            service pill to open its diagnostic drawer, or use Retry all to probe every provider.
          </p>
        </div>
        <span className="rounded-full border border-monitor-border bg-monitor-accent-soft px-2.5 py-1 text-[10px] font-semibold text-monitor-accent-ink">
          {STANDALONE ? 'Installed monitor' : 'Browser preview'}
        </span>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3 lg:grid-cols-4">
        {HEALTH_PROVIDER_ORDER.map((provider) => (
          <li
            key={provider.id}
            className="rounded-lg border border-monitor-border bg-monitor-surface-muted px-2.5 py-2"
          >
            <span className="font-mono text-[9px] uppercase tracking-wide text-monitor-muted">
              {provider.id}
            </span>
            <span className="mt-0.5 block truncate font-semibold" title={provider.name}>
              {provider.name}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[10px] leading-relaxed text-monitor-muted">
        {Object.entries(HEALTH_STATUS_MARKERS)
          .map(([status, marker]) => `${marker} ${status}`)
          .join(' · ')}
        . The HTTP code stays visible next to each status dot.
      </p>
    </section>
  );
}
