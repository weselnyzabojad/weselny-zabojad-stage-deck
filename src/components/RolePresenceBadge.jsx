import { useI18n } from '../i18n/useI18n';

/**
 * One role read-receipt badge on the MC current card (issue #1160).
 *
 * Props stay intentionally small so the badge is a pure visual:
 * - `hasUnreadUpdate` — amber outline while the role has not acknowledged the
 *   latest reschedule revision;
 * - `isOnline` — emerald dot when a presence heartbeat is fresh;
 * - `justConfirmed` — emerald tone for five seconds after a live receipt.
 *
 * The state word is always rendered for screen readers, never colour-only.
 */
export default function RolePresenceBadge({
  roleName,
  hasUnreadUpdate = false,
  isOnline = false,
  justConfirmed = false,
}) {
  const { t } = useI18n();
  const stateLabel = justConfirmed
    ? t('mc.readReceipts.state.read')
    : hasUnreadUpdate
      ? t('mc.readReceipts.state.unread')
      : t('mc.readReceipts.state.idle');
  const connection = isOnline
    ? t('mc.readReceipts.state.online')
    : t('mc.readReceipts.state.offline');

  const tone = justConfirmed
    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-600'
    : hasUnreadUpdate
      ? 'border-amber-500/60 bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/70 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
      : 'border-line bg-raised/60 text-muted';

  return (
    <li
      aria-label={t('mc.readReceipts.badgeAria', {
        role: roleName,
        state: stateLabel,
        connection,
      })}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all duration-300 motion-reduce:transition-none ${tone}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          isOnline ? 'bg-emerald-400' : 'bg-line-strong'
        }`}
      />
      <span className="font-heading uppercase tracking-wide">{roleName}</span>
      {hasUnreadUpdate && !justConfirmed ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 animate-pulse motion-reduce:animate-none"
        />
      ) : null}
      <span className="sr-only">
        {stateLabel}, {connection}
      </span>
    </li>
  );
}
