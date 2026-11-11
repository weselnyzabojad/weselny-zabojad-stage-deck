import syncIcon from '../assets/icons/sync.svg?raw';
import { useI18n } from '../i18n/useI18n.js';
import { resolveSyncState } from '../lib/syncStatus.js';
import { DESKTOP_SURFACE_HOVER, desktopTone, topBarControl } from '../lib/topBarStyles.js';

// Desktop Sync chip: soft neutral surface, status-coloured icon and hover.
// The compact variant stays on the pocket palette.
const TONE_STYLES = {
  positive: { icon: 'text-emerald-700', token: 'text-tone-positive-text' },
  warning: { icon: 'text-amber-600', token: 'text-tone-warning-text' },
  negative: { icon: 'text-red-700', token: 'text-tone-negative-text' },
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
  const surface = compact
    ? topBarControl('neutral')
    : `${desktopTone('neutral')} ${DESKTOP_SURFACE_HOVER}`;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Sync: ${label}`}
      title={title}
      className={`inline-flex min-h-11 items-center gap-2 font-semibold ${surface} ${
        compact ? 'min-w-11 justify-center rounded p-1.5' : 'px-3 py-1.5 text-xs backdrop-blur-sm'
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
          <span
            aria-hidden="true"
            className={`inline-flex [&>svg]:h-[15px] [&>svg]:w-[15px] ${toneStyle.token}`}
            dangerouslySetInnerHTML={{ __html: syncIcon }}
          />
          Sync
        </>
      )}
    </span>
  );
}
