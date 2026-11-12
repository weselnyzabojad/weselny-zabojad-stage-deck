import {
  localizedCountryName,
  localizedLanguageName,
  resolveCoupleIdentity,
} from '../lib/coupleIdentity.js';
import { flagUrl } from '../lib/flags.js';
import { formatWeekdayDate } from '../i18n/index.js';
import { useI18n } from '../i18n/useI18n.js';
import { resolveEventDateISO } from '../lib/eventTime.js';

function Flag({ code }) {
  const { locale } = useI18n();
  const url = flagUrl(code);
  const name = localizedCountryName(code, locale);

  if (!url) {
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

  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-heading text-base font-semibold tracking-wide text-ink">
        {person.firstName}
      </span>
      {visible.length > 0 ? (
        <span className="inline-flex items-center gap-0.5" aria-hidden="true">
          {visible.map((code) => (
            <Flag key={code} code={code} />
          ))}
        </span>
      ) : null}
      {countryNames.length > 0 ? (
        <span className="sr-only">, {countryNames.join(', ')}</span>
      ) : null}
    </span>
  );
}

// Centered couple identity used by every role: names + flags with a ring logo,
// a language row and the localized event date/weekday row.
export default function TopBarCenterIdentity({
  wedding,
  compact = false,
  showCoupleLanguages = true,
  showDate = true,
}) {
  const { t, locale } = useI18n();
  const identity = resolveCoupleIdentity(wedding);
  const dateISO = resolveEventDateISO(wedding);
  const dateLabel = dateISO ? formatWeekdayDate(dateISO, { locale }) : wedding?.date ?? null;

  if (!identity.hasProfile) {
    return (
      <span className="inline-flex items-baseline gap-1 text-ink">
        <strong className="font-heading font-semibold text-ink">
          {identity.displayName}
        </strong>
      </span>
    );
  }

  return (
    <div className={`flex min-w-0 flex-col items-center text-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {identity.people.map((person, index) => (
          <span key={person.role} className="inline-flex items-center gap-2">
            {index > 0 ? (
              <span
                aria-hidden="true"
                title="Wedding rings"
                className="inline-flex items-center justify-center rounded-full bg-raised/50 p-1 text-xl ring-1 ring-line/70"
              >
                💍
              </span>
            ) : null}
            <Person person={person} />
          </span>
        ))}
      </div>

      {showCoupleLanguages && identity.commonLanguages.length > 0 ? (
        <div
          className={`flex flex-wrap items-center justify-center gap-1.5 text-[9px] text-muted ${compact ? '' : 'mt-0.5'}`}
          aria-label={t('couple.languages')}
        >
          <span className="inline-flex items-center gap-1 font-heading font-semibold uppercase tracking-[0.18em] text-muted">
            <span aria-hidden="true" className="shrink-0 text-[13px] leading-none">🗣️</span>
            <span>{t('couple.languages')}</span>
          </span>
          <span aria-hidden="true" className="text-muted">·</span>
          {identity.commonLanguages.map((code) => (
            <span
              key={code}
              title={localizedLanguageName(code, locale)}
              className="rounded-full bg-raised/55 px-2 py-0.5 font-body text-[10px] font-medium text-muted ring-1 ring-line/70"
            >
              {localizedLanguageName(code, locale)}
            </span>
          ))}
        </div>
      ) : null}

      {showDate && dateLabel ? (
        <div className="font-mono text-[11px] tracking-wide text-muted">
          {dateLabel}
        </div>
      ) : null}
    </div>
  );
}
