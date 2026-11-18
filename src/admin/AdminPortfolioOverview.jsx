import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { fetchPortfolioKpis } from './adminApi';
import {
  nextPortfolioSort,
  portfolioYears,
  searchPortfolioRows,
  sortPortfolioRows,
} from './adminPortfolio';

const ADMIN_DEMO = import.meta.env.DEV && import.meta.env.VITE_ADMIN_DEMO === '1';
const NO_ROWS = [];

const STATUS_KEYS = {
  active: 'admin.portfolio.status.active',
  archived: 'admin.portfolio.status.archived',
  expired: 'admin.portfolio.status.expired',
};

const SOURCE_KEYS = {
  recap: 'admin.portfolio.source.recap',
  live: 'admin.portfolio.source.live',
  none: 'admin.portfolio.source.none',
};

const READINESS_KEYS = {
  missing_languages: 'admin.portfolio.readiness.missing_languages',
  missing_steps: 'admin.portfolio.readiness.missing_steps',
  recap_not_published: 'admin.portfolio.readiness.recap_not_published',
  missing_actuals: 'admin.portfolio.readiness.missing_actuals',
};

const COLUMNS = [
  { key: 'couple', label: 'admin.portfolio.table.couple' },
  { key: 'dateISO', label: 'admin.portfolio.table.date' },
  { key: 'status', label: 'admin.portfolio.table.status' },
  { key: 'servicePackage', label: 'admin.portfolio.table.package' },
  { key: 'completionPct', label: 'admin.portfolio.table.progress' },
  { key: 'onTimePct', label: 'admin.portfolio.table.onTime' },
  { key: 'biggestDelayMinutes', label: 'admin.portfolio.table.delay' },
  { key: 'requestsTotal', label: 'admin.portfolio.table.requests' },
  { key: 'compatibilityPct', label: 'admin.portfolio.table.compatibility' },
  { key: 'recapPublished', label: 'admin.portfolio.table.recap' },
  { key: 'dataQuality', label: 'admin.portfolio.table.source' },
];

function percent(value, t) {
  return value == null ? t('admin.portfolio.noData') : `${value}%`;
}

function count(value, t) {
  return value == null ? t('admin.portfolio.noData') : String(value);
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-1 font-heading text-2xl font-bold text-ink">{value}</div>
      {hint ? <div className="mt-1 text-[10px] text-muted">{hint}</div> : null}
    </div>
  );
}

function Distribution({ title, counts: values, emptyLabel, labelFor }) {
  const entries = Object.entries(values ?? {}).filter(([, value]) => Number(value) > 0);
  const total = entries.reduce((sum, [, value]) => sum + Number(value), 0);
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <h3 className="font-heading text-xs font-bold text-ink">{title}</h3>
      {total === 0 ? (
        <p className="mt-2 text-[11px] text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries
            .sort((left, right) => Number(right[1]) - Number(left[1]))
            .map(([key, value]) => (
              <li key={key}>
                <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
                  <span className="truncate text-ink">{labelFor(key)}</span>
                  <span className="font-mono">{value}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-brand motion-reduce:transition-none"
                    style={{ width: `${Math.round((Number(value) / total) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status, t }) {
  const tone =
    status === 'active'
      ? 'border-emerald-700 bg-emerald-950/40 text-emerald-200'
      : status === 'expired'
        ? 'border-amber-700 bg-amber-950/40 text-amber-200'
        : 'border-line bg-raised text-muted';
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${tone}`}>
      {t(STATUS_KEYS[status] ?? 'admin.portfolio.noData')}
    </span>
  );
}

export function PortfolioOverviewView({
  data = null,
  loading = false,
  error = '',
  filters = {},
  query = '',
  sort = { key: 'dateISO', direction: 'desc' },
  onFilterChange = () => {},
  onQueryChange = () => {},
  onSort = () => {},
  onRefresh = () => {},
  readOnly = false,
  demo = false,
}) {
  const { t } = useI18n();
  const rows = data?.weddings ?? NO_ROWS;
  const years = useMemo(() => portfolioYears(rows), [rows]);
  const packages = Object.keys(data?.portfolio?.mix?.packages ?? {});
  const languages = Object.keys(data?.portfolio?.mix?.languages ?? {});
  const visibleRows = useMemo(
    () => sortPortfolioRows(searchPortfolioRows(rows, query), sort.key, sort.direction),
    [rows, query, sort.key, sort.direction],
  );

  const totals = data?.portfolio?.totals ?? {};
  const coverage = data?.portfolio?.coverage ?? {};
  const metrics = data?.portfolio ?? {};
  const acceptedRequests = rows.reduce((sum, row) => sum + (row.requestsAccepted ?? 0), 0);

  const cards = [
    { key: 'total', label: 'admin.portfolio.metric.total', value: count(totals.all, t) },
    { key: 'active', label: 'admin.portfolio.metric.active', value: count(totals.active, t) },
    { key: 'completed', label: 'admin.portfolio.metric.completed', value: count(totals.completed, t) },
    { key: 'live', label: 'admin.portfolio.metric.liveNow', value: count(totals.liveNow, t) },
    {
      key: 'recap',
      label: 'admin.portfolio.metric.recapRate',
      value: percent(metrics.recapPublicationRate, t),
    },
    {
      key: 'onTime',
      label: 'admin.portfolio.metric.onTime',
      value: percent(metrics.averageOnTimePct, t),
    },
    {
      key: 'accepted',
      label: 'admin.portfolio.metric.accepted',
      value: count(data ? acceptedRequests : null, t),
    },
    {
      key: 'compatibility',
      label: 'admin.portfolio.metric.compatibility',
      value: percent(metrics.averageCompatibilityPct, t),
    },
    {
      key: 'games',
      label: 'admin.portfolio.metric.games',
      value: percent(metrics.gamesPlayedPct, t),
    },
  ];

  return (
    <section aria-labelledby="portfolio-overview-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="portfolio-overview-title" className="font-heading text-sm font-bold text-ink">
            {t('admin.portfolio.title')}
          </h2>
          <p className="mt-1 text-[11px] text-muted">{t('admin.portfolio.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {demo ? (
            <span className="rounded border border-amber-700 bg-amber-950/50 px-2 py-1 text-[10px] font-semibold text-amber-200">
              {t('admin.portfolio.demo')}
            </span>
          ) : null}
          {readOnly ? (
            <span className="rounded border border-line bg-raised px-2 py-1 text-[10px] font-semibold text-muted">
              {t('admin.portfolio.readOnly')}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded border border-line bg-raised px-3 py-1.5 text-[11px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong disabled:opacity-50"
          >
            {t('admin.portfolio.refresh')}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-alert/60 bg-alert/15 px-4 py-3 text-xs text-alert-soft">
          <p>{t('admin.portfolio.error')}</p>
          <p className="mt-1 font-mono text-[10px]">{error}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-2 rounded border border-alert/60 bg-page/60 px-2.5 py-1 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong"
          >
            {t('admin.portfolio.retry')}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p role="status" className="rounded-xl border border-line bg-card p-6 text-center text-xs text-muted">
          {t('admin.portfolio.loading')}
        </p>
      ) : null}

      {!loading && !error && !data ? (
        <p className="rounded-xl border border-dashed border-line bg-card p-6 text-center text-xs text-muted">
          {t('admin.portfolio.empty')}
        </p>
      ) : null}

      {data && !error ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {cards.map((card) => (
              <MetricCard key={card.key} label={t(card.label)} value={card.value} />
            ))}
          </div>
          <p className="sr-only">
            {t('admin.portfolio.cardsSummary', {
              total: count(totals.all, t),
              active: count(totals.active, t),
              completed: count(totals.completed, t),
              live: count(totals.liveNow, t),
              recap: percent(metrics.recapPublicationRate, t),
              onTime: percent(metrics.averageOnTimePct, t),
              accepted: count(acceptedRequests, t),
              compatibility: percent(metrics.averageCompatibilityPct, t),
              games: percent(metrics.gamesPlayedPct, t),
            })}
          </p>
          <p className="text-[10px] text-muted">
            {t('admin.portfolio.qualityScope', {
              quality: count(coverage.quality, t),
              total: count(coverage.filters, t),
            })}
          </p>

          <div className="grid gap-2 sm:grid-cols-3">
            <Distribution
              title={t('admin.portfolio.mix.packages')}
              counts={data.portfolio?.mix?.packages}
              emptyLabel={t('admin.portfolio.noData')}
              labelFor={(value) => value.replaceAll('_', ' ')}
            />
            <Distribution
              title={t('admin.portfolio.mix.languages')}
              counts={data.portfolio?.mix?.languages}
              emptyLabel={t('admin.portfolio.noData')}
              labelFor={(value) => value}
            />
            <Distribution
              title={t('admin.portfolio.mix.readiness')}
              counts={data.portfolio?.readiness}
              emptyLabel={t('admin.portfolio.readiness.clear')}
              labelFor={(value) => t(READINESS_KEYS[value] ?? 'admin.portfolio.noData')}
            />
          </div>

          <div className="flex flex-nowrap items-end gap-2 overflow-x-auto rounded-xl border border-line bg-card p-3">
            <label className="min-w-[13rem] flex-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
              {t('admin.portfolio.filters.search')}
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t('admin.portfolio.filters.searchPlaceholder')}
                className="mt-1 w-full rounded border border-line bg-page px-2.5 py-2 text-xs text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong"
              />
            </label>
            <label className="w-28 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted">
              {t('admin.portfolio.filters.year')}
              <select
                value={filters.year ?? ''}
                onChange={(event) => onFilterChange({ ...filters, year: event.target.value })}
                className="mt-1 block w-full rounded border border-line bg-page px-2.5 py-2 text-xs text-ink"
              >
                <option value="">{t('admin.portfolio.filters.allYears')}</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
            <label className="w-32 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted">
              {t('admin.portfolio.filters.status')}
              <select
                value={filters.status ?? 'all'}
                onChange={(event) => onFilterChange({ ...filters, status: event.target.value })}
                className="mt-1 block w-full rounded border border-line bg-page px-2.5 py-2 text-xs text-ink"
              >
                <option value="all">{t('admin.portfolio.status.all')}</option>
                <option value="active">{t('admin.portfolio.status.active')}</option>
                <option value="archived">{t('admin.portfolio.status.archived')}</option>
              </select>
            </label>
            <label className="w-40 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted">
              {t('admin.portfolio.filters.package')}
              <select
                value={filters.package ?? ''}
                onChange={(event) => onFilterChange({ ...filters, package: event.target.value })}
                className="mt-1 block w-full rounded border border-line bg-page px-2.5 py-2 text-xs text-ink"
              >
                <option value="">{t('admin.portfolio.filters.allPackages')}</option>
                {packages.map((value) => (
                  <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label className="w-32 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted">
              {t('admin.portfolio.filters.language')}
              <select
                value={filters.language ?? ''}
                onChange={(event) => onFilterChange({ ...filters, language: event.target.value })}
                className="mt-1 block w-full rounded border border-line bg-page px-2.5 py-2 text-xs text-ink"
              >
                <option value="">{t('admin.portfolio.filters.allLanguages')}</option>
                {languages.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="sr-only" role="status">
            {t('admin.portfolio.rowsSummary', {
              shown: visibleRows.length,
              total: rows.length,
            })}
          </p>

          {visibleRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-card p-6 text-center text-xs text-muted">
              {t('admin.portfolio.empty')}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-card">
              <table className="min-w-full text-left text-xs">
                <caption className="sr-only">{t('admin.portfolio.table.caption')}</caption>
                <thead className="border-b border-line font-heading text-[9px] uppercase tracking-widest text-muted">
                  <tr>
                    {COLUMNS.map((column) => {
                      const active = sort.key === column.key;
                      return (
                        <th
                          key={column.key}
                          scope="col"
                          aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                          className="px-3 py-2"
                        >
                          <button
                            type="button"
                            onClick={() => onSort(nextPortfolioSort(sort, column.key))}
                            className="inline-flex items-center gap-1 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong"
                            aria-label={t('admin.portfolio.table.sort', { column: t(column.label) })}
                          >
                            {t(column.label)}
                            <span aria-hidden="true" className="font-mono text-[8px]">
                              {active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="border-b border-line/60 align-top">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-ink">{row.couple || t('admin.portfolio.noData')}</div>
                        <div className="font-mono text-[9px] text-muted">{row.id}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted">{row.date || t('admin.portfolio.noData')}</td>
                      <td className="px-3 py-2"><StatusPill status={row.status} t={t} /></td>
                      <td className="px-3 py-2 text-[10px] text-muted">{row.servicePackage || t('admin.portfolio.noData')}</td>
                      <td className="px-3 py-2 text-[10px] text-muted">
                        {row.completionPct == null
                          ? t('admin.portfolio.noData')
                          : t('admin.portfolio.value.progress', {
                              done: count(row.completedSteps, t),
                              total: count(row.totalSteps, t),
                              percentage: row.completionPct,
                            })}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-muted">{percent(row.onTimePct, t)}</td>
                      <td className="px-3 py-2 text-[10px] text-muted">
                        {row.biggestDelayMinutes == null
                          ? t('admin.portfolio.noData')
                          : t('admin.portfolio.value.delay', { minutes: row.biggestDelayMinutes })}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-muted">
                        {row.requestsTotal > 0
                          ? t('admin.portfolio.value.requests', {
                              accepted: row.requestsAccepted,
                              total: row.requestsTotal,
                              played: row.requestsPlayed,
                            })
                          : t('admin.portfolio.noData')}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-muted">{percent(row.compatibilityPct, t)}</td>
                      <td className="px-3 py-2 text-[10px] text-muted">
                        {row.recapPublished
                          ? t('admin.portfolio.recap.published')
                          : t('admin.portfolio.recap.notPublished')}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-muted">
                        {t(SOURCE_KEYS[row.dataQuality] ?? 'admin.portfolio.source.none')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

export default function AdminPortfolioOverview({ readOnly = false }) {
  const [filters, setFilters] = useState({ year: '', status: 'all', package: '', language: '' });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'dateISO', direction: 'desc' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react/set-state-in-effect -- fetch() starts with the loading flag before the network request
    setLoading(true);
    setError('');
    fetchPortfolioKpis(filters)
      .then((next) => {
        if (active) setData(next);
      })
      .catch((err) => {
        if (active) setError(err.message ?? 'Could not load the portfolio.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, reload]);

  return (
    <PortfolioOverviewView
      data={data}
      loading={loading}
      error={error}
      filters={filters}
      query={query}
      sort={sort}
      onFilterChange={setFilters}
      onQueryChange={setQuery}
      onSort={setSort}
      onRefresh={() => setReload((value) => value + 1)}
      readOnly={readOnly}
      demo={ADMIN_DEMO}
    />
  );
}
