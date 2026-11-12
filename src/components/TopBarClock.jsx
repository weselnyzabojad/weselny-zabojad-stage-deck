import { useI18n } from '../i18n/useI18n.js';

export default function TopBarClock({ clock, className = '' }) {
  const { t } = useI18n();
  if (!clock?.nowClock) return null;

  return (
    <span
      className={`font-mono text-3xl leading-none font-semibold tracking-[0.08em] tabular-nums text-ink ${className}`}
      aria-label={t('clock.currentTime')}
      title={t('clock.currentTime')}
    >
      {clock.nowClock}
    </span>
  );
}
