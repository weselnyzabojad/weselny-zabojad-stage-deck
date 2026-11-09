import {
  localizedCountryName,
  localizedLanguageName,
  resolveCoupleIdentity,
} from '../lib/coupleIdentity.js';
import { flagUrl } from '../lib/flags.js';
import { useI18n } from '../i18n/useI18n.js';

function Flag({ code }) {
  const { locale } = useI18n();
  const url = flagUrl(code);
  const name = localizedCountryName(code, locale);

  if (!url) {
    // Unknown / unbundled code: plain text, never a guessed flag.
    return (
      <span className="rounded border border-line-strong bg-raised px-1 font-mono text-[9px] text-ink">
        {code}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt=""
      aria-hidden="true"
      title={name}
      className="inline-block h-[18px] w-[24px] shrink-0 rounded-[2px] border border-black/40 object-cover shadow-sm"
    />
  );
}

function Person({ person }) {
  const { locale } = useI18n();
  const countryNames = person.nationalities
    .map((code) => localizedCountryName(code, locale))
    .filter(Boolean);
  const visible = person.nationalities.slice(0, 2);
  const extra = person.nationalities.length - visible.length;

  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-heading font-semibold text-ink">{person.firstName}</span>
      {visible.length > 0 ? (
        <span className="inline-flex items-center gap-0.5" aria-hidden="true">
          {visible.map((code) => (
            <Flag key={code} code={code} />
          ))}
          {extra > 0 ? (
            <span className="font-mono text-[9px] text-muted">+{extra}</span>
          ) : null}
        </span>
      ) : null}
      {countryNames.length > 0 ? (
        <span className="sr-only">, {countryNames.join(', ')}</span>
      ) : null}
    </span>
  );
}

// Cartridge-driven couple identity for the top bar (TODO 15 / Phase 1.5c).
// `coupleProfile` -> legacy `couple` -> "Wedding". No demo names live here.
// The language chips describe the couple's shared content languages, not the
// per-device UI language (see LanguageToggle).
export default function CoupleIdentity({ wedding, className = '' }) {
  const { t, locale } = useI18n();
  const identity = resolveCoupleIdentity(wedding);

  if (!identity.hasProfile) {
    return (
      <span className={`inline-flex items-baseline gap-1 text-ink ${className}`}>
        <span>{t('couple.wedding')}</span>
        <strong className="font-heading font-semibold text-ink">
          {identity.fallbackLabel}
        </strong>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 ${className}`}
    >
      {identity.people.map((person, index) => (
        <span key={person.role} className="inline-flex items-center gap-1.5">
          {index > 0 ? (
            <span aria-hidden="true" className="text-muted">
              &amp;
            </span>
          ) : null}
          <Person person={person} />
        </span>
      ))}

      {identity.commonLanguages.length > 0 ? (
        <span className="hidden items-center gap-1 sm:inline-flex">
          <span aria-hidden="true" className="text-muted">
            ·
          </span>
          <span aria-hidden="true" className="text-[11px] text-muted">
            🌐
          </span>
          {identity.commonLanguages.map((code) => (
            <span
              key={code}
              title={localizedLanguageName(code, locale)}
              className="rounded border border-line-strong bg-raised px-1 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-brand-tint"
            >
              {code}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
