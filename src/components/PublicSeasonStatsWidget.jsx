import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CarFront,
  Globe2,
  Plane,
  Sparkles,
  Users,
} from 'lucide-react';
import CountryFlag from './CountryFlag.jsx';
import { getLocale, setLocale, SUPPORTED_LOCALES } from '../i18n/index.js';
import { useI18n } from '../i18n/useI18n.js';
import { fetchSeasonStats } from '../lib/seasonStats.js';
import { normalisePreviewState } from '../lib/seasonStatsPreview.js';

// Static so Vite can drop the preview chunk from production builds.
const EMBED_PREVIEW_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_EMBED_PREVIEW === '1';

const ATTRIBUTION_URL = 'https://deck.weselnyzabojad.pl';
const CARD_BORDER = 'border-[#EAE2D3]/80';
const GOLD = 'text-[#B89550]';
const INK = 'text-[#292524]';
const MUTED = 'text-[#78716C]';
const SHORT_LOCALE = { en: 'EN', fr: 'FR', pl: 'PL' };

function positive(value) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function formatNumber(value, locale) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat(locale, { useGrouping: 'always' }).format(value)
    : null;
}

function monthYear(value, locale) {
  if (!Number.isInteger(value?.year) || !Number.isInteger(value?.month)) return '';
  const date = new Date(Date.UTC(value.year, value.month - 1, 1));
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return `${value.month}/${value.year}`;
  }
}

function seasonDestinations(data) {
  const plan = data?.seasonPlan;
  if (Array.isArray(plan?.destinations)) {
    return plan.destinations
      .map((entry) => ({
        country: typeof entry?.country === 'string' ? entry.country.trim().toUpperCase() : '',
        planned: Number.isFinite(entry?.planned) ? entry.planned : 0,
        completed: Number.isFinite(entry?.completed) ? entry.completed : 0,
      }))
      .filter((entry) => entry.country)
      .sort(
        (left, right) =>
          right.planned +
            right.completed -
            (left.planned + left.completed) ||
          left.country.localeCompare(right.country),
      );
  }
  return (Array.isArray(data?.kpis?.destinations) ? data.kpis.destinations : [])
    .map((entry) => ({
      country: typeof entry?.country === 'string' ? entry.country.trim().toUpperCase() : '',
      planned: 0,
      completed: Number.isFinite(entry?.weddings) ? entry.weddings : 0,
    }))
    .filter((entry) => entry.country)
    .sort((left, right) => right.completed - left.completed);
}

function Vehicle({ country }) {
  const Icon = country === 'PL' ? CarFront : Plane;
  return (
    <span
      aria-hidden="true"
      data-vehicle={country === 'PL' ? 'car' : 'plane'}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F7F2E7] text-[#B89550]"
    >
      <Icon size={13} strokeWidth={1.5} />
    </span>
  );
}

function LanguageSwitch({ locale, onSelect, t }) {
  return (
    <div
      role="radiogroup"
      aria-label={t('language.label')}
      className={`inline-flex items-center gap-0.5 rounded-full border ${CARD_BORDER} bg-[#FAF8F5]/70 p-0.5`}
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
            onClick={() => onSelect(code)}
            className={`min-h-6 min-w-7 rounded-full px-1.5 text-[10px] font-semibold transition ${
              active
                ? 'bg-[#F7F2E7] text-[#B89550]'
                : `text-[#78716C] hover:text-[#292524]`
            }`}
          >
            {SHORT_LOCALE[code]}
          </button>
        );
      })}
    </div>
  );
}

function Skeleton({ label }) {
  return (
    <div aria-busy="true" className="space-y-1">
      <div className={`h-9 animate-pulse rounded-xl border ${CARD_BORDER} bg-[#FFFDF9]/70 motion-reduce:animate-none`} />
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className={`h-14 animate-pulse rounded-xl border ${CARD_BORDER} bg-[#FFFDF9]/70 motion-reduce:animate-none`}
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

function stateBadge(state, year, t) {
  if (state === 'pre') {
    return { label: t('embed.state.preBadge', { year }), pulse: false };
  }
  if (state === 'live') {
    return { label: t('embed.state.liveBadge'), pulse: true };
  }
  return { label: t('embed.state.postBadge', { year }), pulse: false };
}

function DestinationBadges({ destinations, state }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {destinations.map((entry) => {
        const preview = state === 'pre';
        const upcomingOnly = state === 'live' && entry.completed === 0 && entry.planned > 0;
        const count = preview ? entry.planned : entry.completed;
        const display =
          state === 'live' && entry.planned > 0 && entry.planned !== entry.completed
            ? `${entry.completed}/${entry.planned}`
            : count;
        return (
          <span
            key={entry.country}
            data-country={entry.country}
            className={`inline-flex items-center gap-1 rounded-full border ${CARD_BORDER} bg-[#FAF8F5] px-2 py-0.5 text-[11px] ${MUTED} ${
              upcomingOnly ? 'opacity-65' : ''
            }`}
          >
            <CountryFlag code={entry.country} className="h-2.5 w-3.5" />
            <span className="font-medium text-[#57534E]">{entry.country}</span>
            <span className="text-[#B89550]">·</span>
            <span className={`font-semibold tabular-nums ${INK}`}>{display}</span>
          </span>
        );
      })}
    </span>
  );
}

export function PublicSeasonStatsView({
  data = null,
  status = 'ready',
  theme = 'transparent',
}) {
  const { t, tp, locale, setLocale: changeLocale } = useI18n();
  const plan = data?.seasonPlan ?? null;
  const planState = ['pre', 'live', 'post'].includes(plan?.state) ? plan.state : null;
  const seasonState = planState ?? (data?.hasData ? 'post' : 'none');
  const seasonYear = plan?.year ?? data?.seasonYear ?? null;
  const next = data?.nextWedding ?? null;
  const hasNext =
    next &&
    typeof next.city === 'string' &&
    next.city.trim() &&
    typeof next.country === 'string' &&
    next.country.trim();

  const destinations = seasonDestinations(data);
  const destinationTotal = destinations.length;
  const plannedGuests = positive(plan?.guests?.planned);
  const completedGuests =
    positive(plan?.guests?.completed) ?? positive(data?.kpis?.guests?.total);
  const guestValue = seasonState === 'pre' ? plannedGuests : completedGuests;
  const planTotal = Number.isFinite(plan?.weddings?.total) ? plan.weddings.total : null;
  const planCompleted = Number.isFinite(plan?.weddings?.completed)
    ? plan.weddings.completed
    : null;
  const coverageWeddings = Number.isFinite(data?.coverage?.weddings)
    ? data.coverage.weddings
    : null;
  const totalWeddings = planTotal && planTotal > 0 ? planTotal : coverageWeddings;
  const completedWeddings =
    planCompleted && planCompleted > 0 ? planCompleted : coverageWeddings ?? planCompleted;
  const progressPct =
    seasonState === 'live' &&
    Number.isFinite(completedWeddings) &&
    Number.isFinite(totalWeddings) &&
    totalWeddings > 0
      ? Math.round((completedWeddings / totalWeddings) * 100)
      : null;

  const badge = stateBadge(seasonState, seasonYear, t);
  const ready =
    status === 'ready' &&
    seasonState !== 'none' &&
    guestValue != null &&
    destinationTotal > 0;

  const guestLabel =
    seasonState === 'pre' ? t('embed.kpi.guestsExpected') : t('embed.kpi.guests');
  const destinationLabel =
    seasonState === 'pre'
      ? t('embed.kpi.destinationsPlanned')
      : seasonState === 'post'
        ? t('embed.kpi.destinationsVisited')
        : t('embed.kpi.destinations');

  const guestSubline =
    seasonState === 'pre'
      ? t('embed.kpi.guestsPlanned', { total: formatNumber(totalWeddings, locale) ?? '—' })
      : seasonState === 'live'
        ? t('embed.kpi.guestsProgress', {
            completed: formatNumber(completedWeddings, locale) ?? '—',
            total: formatNumber(totalWeddings, locale) ?? '—',
          })
        : t('embed.kpi.guestsFinal', {
            total: formatNumber(totalWeddings, locale) ?? '—',
            year: seasonYear ?? '',
          });

  const strip = (() => {
    if (seasonState === 'pre' && hasNext) {
      return {
        label: t('embed.state.pre'),
        city: next.city,
        date: monthYear(next, locale),
        country: next.country.toUpperCase(),
      };
    }
    if (seasonState === 'live' && hasNext) {
      return {
        label: t('embed.nextWedding'),
        city: next.city,
        date: monthYear(next, locale),
        country: next.country.toUpperCase(),
      };
    }
    if (seasonState === 'post' && hasNext) {
      return {
        label: t('embed.state.nextSeason'),
        city: next.city,
        date: monthYear(next, locale),
        country: next.country.toUpperCase(),
      };
    }
    if (seasonState === 'post') {
      return {
        label: t('embed.state.post', { year: seasonYear ?? '' }),
        city: t('embed.state.postThanks'),
        date: '',
        country: null,
      };
    }
    return null;
  })();

  return (
    <main
      className={`flex w-full justify-center overflow-hidden ${
        theme === 'cream' ? 'bg-[#FAF8F5]' : 'bg-transparent'
      }`}
    >
      <section
        className={`mx-auto w-full min-w-0 max-w-4xl overflow-hidden rounded-xl border ${CARD_BORDER} bg-[#FFFDF9]/90 shadow-[0_2px_12px_-4px_rgba(184,149,80,0.06)]`}
      >
        {status === 'loading' ? (
          <Skeleton label={t('embed.loading')} />
        ) : (
          <>
            <header className={`flex flex-nowrap items-center justify-between gap-2 border-b border-[#EAE2D3]/60 px-4 py-1.5 text-xs`}>
              <div className="flex min-w-0 flex-nowrap items-center gap-2">
                {strip ? (
                  strip.country ? (
                    <Vehicle country={strip.country} />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F7F2E7] text-[#B89550]">
                      <Sparkles size={13} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                  )
                ) : null}
                <span className={`shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] ${MUTED}`}>
                  {strip?.label ?? t('embed.footer.season')}
                </span>
                {strip?.city ? (
                  <span
                    className={`font-serif text-sm font-medium italic ${
                      strip.country ? `inline ${INK}` : `hidden sm:inline ${MUTED}`
                    }`}
                  >
                    {strip.city}
                  </span>
                ) : null}
                {strip?.date ? <span className={`hidden text-[11px] font-medium sm:inline ${GOLD}`}>{strip.date}</span> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {strip ? (
                  <span className={`hidden items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] sm:flex ${MUTED}`}>
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full bg-[#B89550] ${
                        badge.pulse ? 'animate-pulse motion-reduce:animate-none' : ''
                      }`}
                    />
                    {badge.label}
                  </span>
                ) : null}
                <LanguageSwitch
                  locale={locale}
                  onSelect={(code) => changeLocale(code)}
                  t={t}
                />
              </div>
            </header>

            {ready ? (
              <div className="grid min-w-0 grid-cols-1 divide-y divide-[#EAE2D3]/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div data-kpi-column="guests" className="min-w-0 px-4 py-2.5 sm:px-5">
                  <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] ${MUTED}`}>
                    <Users aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {guestLabel}
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className={`text-xl font-semibold tabular-nums sm:text-2xl ${INK}`}>
                      {formatNumber(guestValue, locale)}
                    </span>
                    <span className={`text-xs ${MUTED}`}>{guestSubline}</span>
                  </div>
                  {seasonState === 'live' && progressPct != null ? (
                    <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-[#F7F2E7]">
                      <div
                        className="h-full rounded-full bg-[#B89550]"
                        style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                      />
                    </div>
                  ) : null}
                </div>

                <div data-kpi-column="destinations" className="min-w-0 px-4 py-2.5 sm:px-5">
                  <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] ${MUTED}`}>
                    <Globe2 aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {destinationLabel}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium ${INK}`}>
                      {tp('embed.kpi.countries', destinationTotal)}
                    </span>
                    <DestinationBadges destinations={destinations} state={seasonState} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-5 text-center">
                <Sparkles aria-hidden="true" className={`mx-auto h-4 w-4 ${GOLD}`} strokeWidth={1.5} />
                <p className={`mt-1.5 text-xs ${MUTED}`}>{t('embed.fallback')}</p>
              </div>
            )}

            <footer className="flex flex-row items-center justify-between gap-2 border-t border-[#EAE2D3]/60 bg-[#FAF8F5]/50 px-4 py-1 text-[11px] text-[#78716C]/80">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#B89550]" />
                {t('embed.footer.season')}
                {seasonYear ? ` ${seasonYear}` : ''}
              </span>
              <a
                href={ATTRIBUTION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1 rounded transition-colors hover:text-[#B89550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B89550]"
              >
                {t('embed.footer.powered')}{' '}
                <span className="font-semibold text-[#B89550]">{t('embed.footer.brand')}</span>
                <ArrowRight
                  aria-hidden="true"
                  className="h-3 w-3 text-[#B89550] transition-transform duration-300 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
                  strokeWidth={1.5}
                />
              </a>
            </footer>
          </>
        )}
      </section>
    </main>
  );
}

export default function PublicSeasonStatsWidget({
  route = { lang: null, theme: 'transparent', previewState: null },
}) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const previewState = EMBED_PREVIEW_ENABLED
    ? normalisePreviewState(route.previewState)
    : null;

  useEffect(() => {
    if (!route.lang) return undefined;
    const previous = getLocale();
    setLocale(route.lang, { persist: false });
    return () => setLocale(previous, { persist: false });
  }, [route.lang]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const body = document.body;
    const previous = {
      rootBackground: root.style.background,
      bodyBackground: body.style.background,
      bodyBackgroundColor: body.style.backgroundColor,
      bodyBackgroundImage: body.style.backgroundImage,
    };
    root.style.background = 'transparent';
    body.style.background = 'transparent';
    body.style.backgroundColor = 'transparent';
    body.style.backgroundImage = 'none';
    return () => {
      root.style.background = previous.rootBackground;
      body.style.background = previous.bodyBackground;
      body.style.backgroundColor = previous.bodyBackgroundColor;
      body.style.backgroundImage = previous.bodyBackgroundImage;
    };
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      if (previewState) {
        const { previewSeasonStats } = await import('../demo/seasonStatsPreview.js');
        setData(previewSeasonStats(previewState));
        setStatus('ready');
        return;
      }
      const next = await fetchSeasonStats();
      setData(next);
      setStatus('ready');
    } catch {
      setData(null);
      setStatus('error');
    }
  }, [previewState]);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- loads the public RPC or preview payload
    void load();
  }, [load]);

  return <PublicSeasonStatsView data={data} status={status} theme={route.theme} />;
}
