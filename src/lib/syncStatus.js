// Shared sync-status presentation. The desktop banner shows the status text;
// the pocket header folds the same state into the role badge.
const STATUS_KEY = {
  disabled: 'status.localOnly',
  connecting: 'status.connecting',
  connected: 'status.connected',
  disconnected: 'status.disconnected',
  offline: 'status.offline',
  error: 'status.syncError',
};

function resolveTone(status, pending) {
  if (pending || status === 'connecting') return 'warning';
  if (status === 'connected') return 'positive';
  return 'negative';
}

export function resolveSyncState(
  { status, error, remoteUpdatedAt, outbox = null },
  { t, tp, formatTime },
) {
  const pending = Boolean(outbox);
  const attempts = pending ? outbox.attempts ?? 0 : 0;
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

  return {
    tone: resolveTone(status, pending),
    label,
    title,
    pending,
  };
}
