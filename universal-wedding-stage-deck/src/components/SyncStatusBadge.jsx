import syncIcon from '../assets/icons/sync.svg?raw';
import { useI18n } from '../i18n/useI18n.js';
import { topBarControl } from '../lib/topBarStyles.js';

// The chip surface is the shared white/black top-bar control; the status stays
// readable through a coloured dot (wide) or icon (compact).
const SYNC_STATUS_TONES = {
  disabled: { dot: 'bg-red-600', icon: 'text-red-700' },
  connecting: { dot: 'bg-amber-500', icon: 'text-amber-600' },
  connected: { dot: 'bg-emerald-500', icon: 'text-emerald-700' },
  disconnected: { dot: 'bg-red-600', icon: 'text-red-700' },
  offline: { dot: 'bg-red-600', icon: 'text-red-700' },
  error: { dot: 'bg-red-600', icon: 'text-red-700' },
};

// TODO 25: an outbox entry overrides the ordinary status. It stays visible
// until the cloud confirms the latest snapshot, so a failed publish cannot be
// mistaken for a clean sync.
const OUTBOX_TONE = { dot: 'bg-amber-500', icon: 'text-amber-600' };

const STATUS_KEY = {
  disabled: 'status.localOnly',
  connecting: 'status.connecting',
  connected: 'status.connected',
  disconnected: 'status.disconnected',
  offline: 'status.offline',
  error: 'status.syncError',
};

export default function SyncStatusBadge({
  status,
  error,
  remoteUpdatedAt,
  outbox = null,
  compact = false,
}) {
  const { t, tp, formatTime } = useI18n();
  const pending = Boolean(outbox);
  const attempts = pending ? outbox.attempts ?? 0 : 0;
  const tone = pending
    ? OUTBOX_TONE
    : SYNC_STATUS_TONES[status] ?? SYNC_STATUS_TONES.disabled;
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
      className={`inline-flex min-h-11 items-center gap-1.5 rounded font-semibold ${topBarControl('neutral')} ${
        compact ? 'min-w-11 justify-center p-1.5' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {compact ? (
        <span
          aria-hidden="true"
          className={`inline-flex [&>svg]:h-[18px] [&>svg]:w-[18px] ${tone.icon}`}
          dangerouslySetInnerHTML={{ __html: syncIcon }}
        />
      ) : (
        <>
          <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          Sync
        </>
      )}
    </span>
  );
}
