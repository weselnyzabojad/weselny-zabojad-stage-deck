import { useI18n } from '../i18n/useI18n.js';

const SYNC_STATUS_STYLES = {
  disabled: 'border-alert/60 bg-alert/20 text-alert-soft',
  connecting: 'border-amber-700 bg-amber-950/70 text-amber-200',
  connected: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  disconnected: 'border-alert/60 bg-alert/20 text-alert-soft',
  offline: 'border-alert/60 bg-alert/20 text-alert-soft',
  error: 'border-alert/60 bg-alert/20 text-alert-soft',
};

// TODO 25: an outbox entry overrides the ordinary status. It stays visible
// until the cloud confirms the latest snapshot, so a failed publish cannot be
// mistaken for a clean sync.
const OUTBOX_STYLE = 'border-amber-700 bg-amber-950/70 text-amber-200';

const STATUS_KEY = {
  disabled: 'status.localOnly',
  connecting: 'status.connecting',
  connected: 'status.connected',
  disconnected: 'status.disconnected',
  offline: 'status.offline',
  error: 'status.syncError',
};

export default function SyncStatusBadge({ status, error, remoteUpdatedAt, outbox = null }) {
  const { t, tp, formatTime } = useI18n();
  const pending = Boolean(outbox);
  const attempts = pending ? outbox.attempts ?? 0 : 0;
  const tone = pending
    ? OUTBOX_STYLE
    : SYNC_STATUS_STYLES[status] ?? SYNC_STATUS_STYLES.disabled;
  const nextRetry = pending
    ? outbox.nextAttemptAt && Number.isFinite(new Date(outbox.nextAttemptAt).getTime())
      ? formatTime(outbox.nextAttemptAt, { seconds: true })
      : null
    : null;

  const statusKey = STATUS_KEY[status] ?? STATUS_KEY.disabled;
  const label =
    pending && attempts > 0
      ? t('status.pendingSyncCount', { count: attempts })
      : t(statusKey);

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
      aria-label={`Sync: ${label}`}
      title={title}
      className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      Sync
    </span>
  );
}
