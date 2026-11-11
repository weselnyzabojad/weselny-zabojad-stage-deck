import syncIcon from '../assets/icons/sync.svg?raw';
import { useI18n } from '../i18n/useI18n.js';
import { resolveSyncState } from '../lib/syncStatus.js';
import { topBarControl } from '../lib/topBarStyles.js';

// The chip surface is the shared white/black top-bar control; the status stays
// readable through a coloured dot (wide) or icon (compact).
const TONE_STYLES = {
  positive: { dot: 'bg-emerald-500', icon: 'text-emerald-700' },
  warning: { dot: 'bg-amber-500', icon: 'text-amber-600' },
  negative: { dot: 'bg-red-600', icon: 'text-red-700' },
};

export default function SyncStatusBadge({
  status,
  error,
  remoteUpdatedAt,
  outbox = null,
  compact = false,
}) {
  const { t, tp, formatTime } = useI18n();
  const { tone, label, title } = resolveSyncState(
    { status, error, remoteUpdatedAt, outbox },
    { t, tp, formatTime },
  );
  const toneStyle = TONE_STYLES[tone] ?? TONE_STYLES.negative;

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
          className={`inline-flex [&>svg]:h-[18px] [&>svg]:w-[18px] ${toneStyle.icon}`}
          dangerouslySetInnerHTML={{ __html: syncIcon }}
        />
      ) : (
        <>
          <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${toneStyle.dot}`} />
          Sync
        </>
      )}
    </span>
  );
}
