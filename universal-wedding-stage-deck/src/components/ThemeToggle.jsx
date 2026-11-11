import { useI18n } from '../i18n/useI18n';
import { TOP_BAR_NEUTRAL_HOVER, topBarControl } from '../lib/topBarStyles.js';

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// Icon-only theme switch. The accessible label/tooltip explains the action.
export default function ThemeToggle({ theme = 'night', onToggle, className = '' }) {
  const { t } = useI18n();
  const isDay = theme === 'day';
  const label = isDay ? t('theme.toNight') : t('theme.toDay');

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDay}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded transition sm:h-8 sm:w-8 ${topBarControl('neutral', TOP_BAR_NEUTRAL_HOVER)} ${className}`}
    >
      {isDay ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
