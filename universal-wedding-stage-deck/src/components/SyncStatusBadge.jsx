const SYNC_STATUS_STYLES = {
  disabled: { label: 'Local only', dot: 'bg-slate-500', chip: 'bg-raised border-line-strong text-slate-300' },
  connecting: { label: 'Connecting…', dot: 'bg-amber-400 animate-pulse', chip: 'bg-amber-950/60 border-amber-800 text-amber-200' },
  connected: { label: 'Cloud synced', dot: 'bg-emerald-400', chip: 'bg-emerald-950/60 border-emerald-800 text-emerald-200' },
  disconnected: { label: 'Disconnected', dot: 'bg-amber-500', chip: 'bg-amber-950/60 border-amber-800 text-amber-200' },
  offline: { label: 'Offline', dot: 'bg-slate-400', chip: 'bg-slate-900 border-slate-700 text-slate-300' },
  error: { label: 'Sync error', dot: 'bg-alert', chip: 'bg-alert/20 border-alert/60 text-alert-soft' },
};

// TODO 25: an outbox entry overrides the ordinary status. It stays visible
// until the cloud confirms the latest snapshot, so a failed publish cannot be
// mistaken for a clean sync.
const OUTBOX_STYLE = {
  label: 'Pending sync',
  dot: 'bg-amber-400 animate-pulse',
  chip: 'bg-amber-950/70 border-amber-700 text-amber-200',
};

function retryLabel(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function SyncStatusBadge({ status, error, remoteUpdatedAt, outbox = null }) {
  const pending = Boolean(outbox);
  const attempts = pending ? outbox.attempts ?? 0 : 0;
  const meta = pending ? OUTBOX_STYLE : SYNC_STATUS_STYLES[status] ?? SYNC_STATUS_STYLES.disabled;
  const nextRetry = pending ? retryLabel(outbox.nextAttemptAt) : null;
  const label = pending && attempts > 0 ? `Pending sync · ${attempts}` : meta.label;

  const title = pending
    ? [
        'Queued locally — the latest stage state has not reached the cloud yet.',
        attempts > 0 ? `${attempts} failed attempt${attempts === 1 ? '' : 's'}.` : null,
        nextRetry ? `Next retry at ${nextRetry}.` : null,
        outbox.lastError ? `Last error: ${outbox.lastError}` : null,
      ]
        .filter(Boolean)
        .join(' ')
    : error
      ? `Cloud sync: ${error}`
      : remoteUpdatedAt
        ? `Last remote update: ${new Date(remoteUpdatedAt).toLocaleTimeString()}`
        : 'Cloud sync status';

  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      title={title}
      className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs border ${meta.chip}`}
    >
      <span aria-hidden="true" className={`flex h-2 w-2 rounded-full ${meta.dot}`} />
      <span>{label}</span>
    </span>
  );
}
