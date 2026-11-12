import { useI18n } from '../i18n/useI18n.js';
import { SUPPORTED_LOCALES } from '../i18n/index.js';

const SHORT = { en: 'EN', fr: 'FR', pl: 'PL' };

// Device-only UI language switch (issue #78). It is intentionally separate from
// the couple's shared-language chips in CoupleIdentity: those describe the
// cartridge content, while this changes only this device's interface.
export default function LanguageToggle({ className = '', variant = 'segmented' }) {
  const { locale, setLocale, t } = useI18n();

  // Pocket header: one cell that visibly cycles through the supported locales.
  // The desktop segmented control below stays unchanged.
  if (variant === 'cycle') {
    const currentIndex = SUPPORTED_LOCALES.indexOf(locale);
    const next = SUPPORTED_LOCALES[(currentIndex + 1) % SUPPORTED_LOCALES.length];
    const action = `${t('language.switch')} → ${t(`language.${next}`)}`;

    return (
      <button
        type="button"
        onClick={() => setLocale(next)}
        aria-label={action}
        title={action}
        className={`inline-flex min-h-11 min-w-11 items-center gap-1 rounded-xl px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.08em] text-ink transition hover:bg-card/60 hover:text-ink ${className}`}
      >
        <span aria-hidden="true" className="text-sm leading-none">🌐</span>
        <span>{SHORT[locale]}</span>
        <span aria-hidden="true" className="text-[9px] leading-none">▾</span>
      </button>
    );
  }

  // Desktop role bars: the segmented control lives inside a shared utility
  // surface (`DesktopUtilityGroup`), so it draws only the active cell.
  if (variant === 'desktop') {
    return (
      <div
        role="radiogroup"
        aria-label={t('language.label')}
        title={t('language.switch')}
        className={`inline-flex items-center gap-0.5 ${className}`}
      >
        {SUPPORTED_LOCALES.map((code) => {
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
              className={`min-h-11 min-w-11 rounded-xl px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.08em] transition ${
                active
                  ? 'bg-card text-ink shadow-sm ring-1 ring-line-strong'
                  : 'text-muted hover:bg-card/60 hover:text-ink'
              }`}
            >
              {SHORT[code]}
            </button>
          );
        })}
      </div>
    );
  }

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
