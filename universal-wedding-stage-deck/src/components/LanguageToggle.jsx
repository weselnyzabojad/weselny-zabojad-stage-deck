import { useI18n } from '../i18n/useI18n.js';
import { SUPPORTED_LOCALES } from '../i18n/index.js';

const SHORT = { en: 'EN', fr: 'FR', pl: 'PL' };

// Device-only UI language switch (issue #78). It is intentionally separate from
// the couple's shared-language chips in CoupleIdentity: those describe the
// cartridge content, while this changes only this device's interface.
export default function LanguageToggle({ className = '' }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="radiogroup"
      aria-label={t('language.label')}
      title={t('language.switch')}
      className={`inline-flex items-center overflow-hidden rounded border border-line bg-raised ${className}`}
    >
      {SUPPORTED_LOCALES.map((code, index) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(`language.${code}`)}
            title={t(`language.${code}`)}
            onClick={() => setLocale(code)}
            className={`px-1.5 py-1 font-mono text-[10px] font-bold tracking-wide transition ${
              index > 0 ? 'border-l border-line' : ''
            } ${
              active
                ? 'bg-brand/40 text-ink'
                : 'text-muted hover:bg-line hover:text-ink'
            }`}
          >
            {SHORT[code]}
          </button>
        );
      })}
    </div>
  );
}
