import { useI18n } from '../i18n/useI18n';

// First focusable element in every full-screen view. Hidden until focused.
export default function SkipLink({ target = 'main-content' }) {
  const { t } = useI18n();
  return (
    <a href={`#${target}`} className="skip-link">
      {t('a11y.skipToContent')}
    </a>
  );
}
