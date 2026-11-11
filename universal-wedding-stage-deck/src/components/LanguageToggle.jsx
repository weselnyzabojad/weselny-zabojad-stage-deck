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
      className={`inline-flex items-center overflow-hidden rounded border-2 border-black bg-white text-black ${className}`}
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
            className={`min-h-11 min-w-11 px-2 py-2 font-mono text-[10px] font-bold tracking-wide transition ${
              index > 0 ? 'border-l border-black/40' : ''
            } ${
              active
                ? 'bg-black text-on-accent'
                : 'text-black hover:bg-slate-100'
            }`}
          >
            {SHORT[code]}
          </button>
        );
      })}
    </div>
  );
}
