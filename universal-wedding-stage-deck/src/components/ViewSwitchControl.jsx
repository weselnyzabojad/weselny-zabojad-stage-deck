import { useI18n } from '../i18n/useI18n';

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
      className={`inline-flex items-center gap-1.5 rounded border border-line-strong bg-raised px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-brand-strong hover:bg-line ${className}`}
    >
      <span aria-hidden="true">{returning ? '🎤' : '🎧'}</span>
      <span>{label}</span>
    </button>
  );
}
