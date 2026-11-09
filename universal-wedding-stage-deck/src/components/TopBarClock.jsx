import { useI18n } from '../i18n/useI18n.js';

export default function TopBarClock({ clock, className = '' }) {
  const { t } = useI18n();
  if (!clock?.nowClock) return null;

  return (
    <span
      className={`font-mono text-2xl leading-none font-semibold tabular-nums text-ink ${className}`}
      aria-label={t('clock.currentTime')}
      title={t('clock.currentTime')}
    >
      {clock.nowClock}
    </span>
  );
}
