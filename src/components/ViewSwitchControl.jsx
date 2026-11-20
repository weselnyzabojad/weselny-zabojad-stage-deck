import { useI18n } from '../i18n/useI18n';
import { DESKTOP_SURFACE, DESKTOP_SURFACE_HOVER } from '../lib/topBarStyles.js';

// Production-only navigation between the MC Master view and the read-only DJ
// view. This never changes the authenticated role; the device stays MC.
export default function ViewSwitchControl({
  mode = 'enter',
  tier = 'STANDARD',
  onClick,
  className = '',
}) {
  const { t } = useI18n();
  const returning = mode === 'return';
  const label = returning ? t('viewSwitch.return') : t('viewSwitch.dj');
  const title = returning
    ? t('viewSwitch.returnTitle')
    : t('viewSwitch.djTitle', { tier });

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      title={title}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink ${DESKTOP_SURFACE} ${DESKTOP_SURFACE_HOVER} ${className}`}
    >
      <span aria-hidden="true">{returning ? '🎤' : '🎧'}</span>
      <span>{label}</span>
    </button>
  );
}
