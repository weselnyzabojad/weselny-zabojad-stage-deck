import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CarFront,
  Globe2,
  Plane,
  Sparkles,
  Users,
} from 'lucide-react';
import { getLocale, setLocale } from '../i18n/index.js';
import { useI18n } from '../i18n/useI18n.js';
import { fetchSeasonStats } from '../lib/seasonStats.js';

const ATTRIBUTION_URL = 'https://deck.weselnyzabojad.pl';
const CARD_BORDER = 'border-[#EAE2D3]';
const GOLD = 'text-[#B89550]';
const INK = 'text-[#1C1917]';
const MUTED = 'text-[#78716C]';

function positive(value) {
  return Number.isFinite(value) && value > 0 ? value : null;
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

function internationalWeddings(destinations) {
  if (!Array.isArray(destinations)) return null;
  const total = destinations
    .filter((entry) => {
      const country = typeof entry?.country === 'string' ? entry.country.trim().toUpperCase() : '';
      return country && country !== 'PL';
    })
    .reduce(
      (sum, entry) => sum + (Number.isFinite(entry?.weddings) ? entry.weddings : 0),
      0,
    );
  return positive(total);
}

function Vehicle({ country }) {
  const Icon = country === 'PL' ? CarFront : Plane;
  return (
    <span
      aria-hidden="true"
      data-vehicle={country === 'PL' ? 'car' : 'plane'}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F7F2E7] text-[#B89550]"
    >
      <Icon size={15} strokeWidth={1.5} />
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, subline }) {
  return (
    <div
      className={`rounded-2xl border ${CARD_BORDER} bg-[#FFFDF9] p-5 shadow-[0_4px_20px_-4px_rgba(184,149,80,0.08)] transition-colors hover:border-[#D6C6A5]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`text-[11px] font-medium uppercase leading-snug tracking-[0.12em] ${MUTED}`}>
          {label}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F2E7] text-[#B89550]">
          <Icon size={15} strokeWidth={1.5} aria-hidden="true" />
        </span>
      </div>
      <div className={`mt-3 text-3xl font-bold tabular-nums sm:text-4xl ${INK}`}>{value}</div>
      {subline ? <div className={`mt-2 text-xs ${MUTED}`}>{subline}</div> : null}
    </div>
  );
}

function Skeleton({ label }) {
  return (
    <div aria-busy="true" className="space-y-3">
      <div className={`h-11 animate-pulse rounded-2xl border ${CARD_BORDER} bg-[#FFFDF9]/70 motion-reduce:animate-none`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className={`h-28 animate-pulse rounded-2xl border ${CARD_BORDER} bg-[#FFFDF9]/70 motion-reduce:animate-none`}
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PublicSeasonStatsView({
  data = null,
  status = 'ready',
  theme = 'transparent',
}) {
  const { t, locale } = useI18n();
  const next = data?.nextWedding ?? null;
  const hasNext =
    next &&
    typeof next.city === 'string' &&
    next.city.trim() &&
    typeof next.country === 'string' &&
    next.country.trim();

  const guests = positive(data?.kpis?.guests?.total);
  const destinations = Array.isArray(data?.kpis?.destinations)
    ? positive(data.kpis.destinations.length)
    : null;
  const international = internationalWeddings(data?.kpis?.destinations);
  const animations = positive(data?.kpis?.animations?.total);
  const coverage = data?.coverage ?? {};
  const destinationCodes = (data?.kpis?.destinations ?? [])
    .slice(0, 3)
    .map((entry) => entry.country)
    .filter(Boolean)
    .join(' · ');

  const cards = [
    {
      key: 'guests',
      icon: Users,
      label: t('embed.kpi.guests'),
      value: guests,
      subline:
        guests && Number.isFinite(coverage.guestCounts) && Number.isFinite(coverage.weddings)
          ? t('embed.kpi.guestsCoverage', {
              covered: coverage.guestCounts,
              total: coverage.weddings,
            })
          : null,
    },
    {
      key: 'destinations',
      icon: Globe2,
      label: t('embed.kpi.destinations'),
      value: destinations,
      subline: destinationCodes || null,
    },
    {
      key: 'international',
      icon: Plane,
      label: t('embed.kpi.international'),
      value: international,
      subline: international ? t('embed.kpi.internationalDetail') : null,
    },
    {
      key: 'animations',
      icon: Sparkles,
      label: t('embed.kpi.animations'),
      value: animations,
      subline: null,
    },
  ].filter((card) => card.value != null);

  const ready = status === 'ready' && data?.hasData === true && cards.length >= 2;

  return (
    <main
      className={`flex w-full justify-center overflow-hidden ${
        theme === 'cream' ? 'bg-[#FAF8F5]' : 'bg-transparent'
      }`}
    >
      <section
        className={`w-full min-w-0 max-w-5xl overflow-hidden p-0 ${
          theme === 'cream' ? 'bg-[#FAF8F5]' : 'bg-transparent'
        }`}
      >
        {status === 'loading' ? (
          <Skeleton label={t('embed.loading')} />
        ) : (
          <>
            {hasNext ? (
              <div
                className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border ${CARD_BORDER} bg-[#FFFDF9] px-4 py-2.5 shadow-[0_4px_20px_-4px_rgba(184,149,80,0.08)] sm:rounded-full`}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <Vehicle country={next.country.toUpperCase()} />
                  <span className={`text-[10px] font-medium uppercase tracking-[0.12em] ${MUTED}`}>
                    {t('embed.nextWedding')}
                  </span>
                  <span className={`font-serif text-base font-semibold italic sm:text-lg ${INK}`}>
                    {next.city}
                  </span>
                  <span className={`text-xs font-medium ${GOLD}`}>{monthYear(next, locale)}</span>
                </div>
                <div className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] ${MUTED}`}>
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#B89550]" />
                  {t('embed.seasonLive')}
                </div>
              </div>
            ) : null}

            {ready ? (
              <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
                {cards.map((card) => (
                  <KpiCard
                    key={card.key}
                    icon={card.icon}
                    label={card.label}
                    value={card.value}
                    subline={card.subline}
                  />
                ))}
              </div>
            ) : (
              <div className={`rounded-2xl border ${CARD_BORDER} bg-[#FFFDF9] px-6 py-8 text-center`}>
                <Sparkles aria-hidden="true" className={`mx-auto h-5 w-5 ${GOLD}`} strokeWidth={1.5} />
                <p className={`mt-3 text-sm ${MUTED}`}>{t('embed.fallback')}</p>
              </div>
            )}
          </>
        )}

        <footer
          className={`mt-4 flex flex-col items-center justify-between gap-2 border-t border-[#EAE2D3]/70 pt-3 text-xs sm:flex-row`}
        >
          <div className={`flex items-center gap-2 ${MUTED}`}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#B89550]" />
            {t('embed.footer.season')}
          </div>
          <a
            href={ATTRIBUTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`group inline-flex items-center gap-1 rounded ${MUTED} focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B89550]`}
          >
            {t('embed.footer.powered')}{' '}
            <span className="font-semibold text-[#B89550]">{t('embed.footer.brand')}</span>
            <ArrowRight
              aria-hidden="true"
              className="h-3.5 w-3.5 text-[#B89550] transition-transform duration-300 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
              strokeWidth={1.5}
            />
          </a>
        </footer>
      </section>
    </main>
  );
}

export default function PublicSeasonStatsWidget({
  route = { lang: 'pl', theme: 'transparent' },
}) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const previous = getLocale();
    setLocale(route.lang, { persist: false });
    return () => setLocale(previous, { persist: false });
  }, [route.lang]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const next = await fetchSeasonStats();
      setData(next);
      setStatus('ready');
    } catch {
      setData(null);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- loads the public RPC payload
    void load();
  }, [load]);

  return <PublicSeasonStatsView data={data} status={status} theme={route.theme} />;
}
