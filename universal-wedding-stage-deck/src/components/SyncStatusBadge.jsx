import { useI18n } from '../i18n/useI18n.js';

const SYNC_STATUS_STYLES = {
  disabled: { key: 'status.localOnly', dot: 'bg-slate-500', chip: 'bg-raised border-line-strong text-slate-300' },
  connecting: { key: 'status.connecting', dot: 'bg-amber-400 animate-pulse', chip: 'bg-amber-950/60 border-amber-800 text-amber-200' },
  connected: { key: 'status.connected', dot: 'bg-emerald-400', chip: 'bg-emerald-950/60 border-emerald-800 text-emerald-200' },
  disconnected: { key: 'status.disconnected', dot: 'bg-amber-500', chip: 'bg-amber-950/60 border-amber-800 text-amber-200' },
  offline: { key: 'status.offline', dot: 'bg-slate-400', chip: 'bg-slate-900 border-slate-700 text-slate-300' },
  error: { key: 'status.syncError', dot: 'bg-alert', chip: 'bg-alert/20 border-alert/60 text-alert-soft' },
};

// TODO 25: an outbox entry overrides the ordinary status. It stays visible
// until the cloud confirms the latest snapshot, so a failed publish cannot be
// mistaken for a clean sync.
const OUTBOX_STYLE = {
  key: 'status.pendingSync',
  dot: 'bg-amber-400 animate-pulse',
  chip: 'bg-amber-950/70 border-amber-700 text-amber-200',
};

export default function SyncStatusBadge({ status, error, remoteUpdatedAt, outbox = null }) {
  const { t, tp, formatTime } = useI18n();
  const pending = Boolean(outbox);
  const attempts = pending ? outbox.attempts ?? 0 : 0;
  const meta = pending ? OUTBOX_STYLE : SYNC_STATUS_STYLES[status] ?? SYNC_STATUS_STYLES.disabled;
  const nextRetry = pending
    ? outbox.nextAttemptAt && Number.isFinite(new Date(outbox.nextAttemptAt).getTime())
      ? formatTime(outbox.nextAttemptAt, { seconds: true })
      : null
    : null;
  const label =
    pending && attempts > 0
      ? t('status.pendingSyncCount', { count: attempts })
      : t(meta.key);

  const title = pending
    ? [
        t('status.queuedLocally'),
        attempts > 0 ? tp('status.failedAttempts', attempts) : null,
        nextRetry ? t('status.nextRetry', { time: nextRetry }) : null,
        outbox.lastError ? t('status.lastError', { error: outbox.lastError }) : null,
      ]
        .filter(Boolean)
        .join(' ')
    : error
      ? t('status.cloudSync', { error })
      : remoteUpdatedAt
        ? t('status.lastRemoteUpdate', { time: formatTime(remoteUpdatedAt) })
        : t('status.cloudSyncStatus');

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
