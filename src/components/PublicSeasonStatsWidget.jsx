import { useCallback, useEffect, useState } from 'react';
import { getLocale, setLocale } from '../i18n/index.js';
import { useI18n } from '../i18n/useI18n.js';
import { fetchSeasonStats } from '../lib/seasonStats.js';

const ATTRIBUTION_URL = 'https://deck.weselnyzabojad.pl';

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

function Vehicle({ country }) {
  if (country === 'PL') {
    return (
      <svg
        data-vehicle="car"
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-emerald-300"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 12l1.8-5h14.4L21 12v4H3z" />
        <path d="M5 16v2M19 16v2M6.5 12h11" />
      </svg>
    );
  }
  return (
    <svg
      data-vehicle="plane"
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-emerald-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M2 13l20-8-5 9-6 2-3 5-2-4z" />
    </svg>
  );
}

function KpiCard({ label, value, subline }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-50/60">
        {label}
      </div>
      <div className="mt-1 font-heading text-2xl font-bold text-slate-50">{value}</div>
      {subline ? <div className="mt-1 text-[10px] text-slate-50/60">{subline}</div> : null}
    </div>
  );
}

function Skeleton({ label }) {
  return (
    <div aria-busy="true" className="space-y-3">
      <div className="h-10 animate-pulse rounded-xl border border-slate-800/60 bg-slate-900/40 motion-reduce:animate-none" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl border border-slate-800/60 bg-slate-900/40 motion-reduce:animate-none"
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PublicSeasonStatsView({ data = null, status = 'ready', theme = 'dark' }) {
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
  const stolat = positive(data?.kpis?.stolatWeddings);
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
      label: t('embed.kpi.destinations'),
      value: destinations,
      subline: destinationCodes || null,
    },
    {
      key: 'stolat',
      label: t('embed.kpi.stolat'),
      value: stolat,
      subline: null,
    },
    {
      key: 'animations',
      label: t('embed.kpi.animations'),
      value: animations,
      subline: null,
    },
  ].filter((card) => card.value != null);

  const ready = status === 'ready' && data?.hasData === true && cards.length >= 2;

  return (
    <main
      className={`flex min-h-screen w-full items-start justify-center p-3 sm:p-5 ${
        theme === 'transparent' ? 'bg-transparent' : 'bg-slate-950'
      }`}
    >
      <section
        className={`w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800/80 p-6 ${
          theme === 'transparent' ? 'bg-transparent' : 'bg-slate-950'
        }`}
      >
        {status === 'loading' ? (
          <Skeleton label={t('embed.loading')} />
        ) : (
          <>
            {hasNext ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-50/80">
                <Vehicle country={next.country.toUpperCase()} />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-50/50">
                  {t('embed.nextWedding')}
                </span>
                <span className="font-semibold text-slate-50">{next.city}</span>
                <span className="text-slate-50/60">
                  {monthYear(next, locale)}
                </span>
              </div>
            ) : null}

            {ready ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {cards.map((card) => (
                  <KpiCard
                    key={card.key}
                    label={card.label}
                    value={card.value}
                    subline={card.subline}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 text-center">
                <div aria-hidden="true" className="text-2xl text-emerald-300">
                  ✦
                </div>
                <p className="mt-2 text-sm text-slate-50/80">{t('embed.fallback')}</p>
              </div>
            )}
          </>
        )}

        <footer className="mt-4 border-t border-slate-800/70 pt-3 text-[10px] text-slate-50/60">
          <a
            href={ATTRIBUTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none"
            />
            {t('embed.footer')}
          </a>
        </footer>
      </section>
    </main>
  );
}

export default function PublicSeasonStatsWidget({ route = { lang: 'pl', theme: 'dark' } }) {
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
