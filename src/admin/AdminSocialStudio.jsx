import { useEffect, useMemo, useState } from 'react';
import SocialExportStudio from '../components/SocialExportStudio';
import { useSeasonStats } from './useSeasonStats';
import { useSocialData } from './useSocialData';
import { firstUpcomingWedding, socialPeriod } from './socialPeriod.js';

export default function AdminSocialStudio({ weddings = [], readOnly = false }) {
  const upcoming = useMemo(() => firstUpcomingWedding(weddings), [weddings]);
  const [weddingId, setWeddingId] = useState(null);
  const [seasonYear, setSeasonYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- select the first upcoming wedding when data loads
    setWeddingId((current) => current ?? upcoming?.wedding_id ?? weddings[0]?.wedding_id ?? null);
  }, [upcoming?.wedding_id, weddings]);

  const selected =
    weddings.find((row) => row.wedding_id === weddingId) ?? upcoming ?? weddings[0] ?? null;
  const period = socialPeriod(selected);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- follow the selected wedding's event year
    if (period.year) setSeasonYear(period.year);
  }, [period.year]);

  const social = useSocialData({ row: selected, active: Boolean(selected) });
  const season = useSeasonStats({
    active: Boolean(selected),
    seasonYear,
    month: period.month,
  });

  if (!selected) {
    return (
      <section className="rounded-xl border border-dashed border-line bg-card p-6 text-center text-xs text-muted">
        No upcoming wedding is available for Social Media Studio.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-card p-3">
        <label className="flex min-w-[15rem] flex-1 flex-col gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
          Wedding
          <select
            value={selected.wedding_id}
            onChange={(event) => setWeddingId(event.target.value)}
            className="rounded border border-line bg-page px-2.5 py-2 text-xs text-ink"
          >
            {weddings.map((row) => (
              <option key={row.wedding_id} value={row.wedding_id}>
                {row.couple ?? row.wedding_id} · {row.date ?? row.dateISO ?? ''}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[9rem] flex-col gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
          Season
          <select
            value={seasonYear}
            onChange={(event) => setSeasonYear(Number(event.target.value))}
            className="rounded border border-line bg-page px-2.5 py-2 text-xs text-ink"
          >
            {[seasonYear - 2, seasonYear - 1, seasonYear, seasonYear + 1].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
        {readOnly ? (
          <span className="text-[10px] text-muted">Read-only: preview and export only.</span>
        ) : null}
      </div>

      <SocialExportStudio
        surface="admin"
        wedding={social.data?.wedding ?? selected}
        liveState={social.data?.liveState ?? null}
        recap={social.data?.recap ?? null}
        requests={social.data?.requests ?? []}
        dataLoading={social.loading}
        dataError={social.error}
        onRetry={social.retry}
        seasonData={season.data}
        seasonYear={seasonYear}
        seasonYears={[seasonYear - 2, seasonYear - 1, seasonYear, seasonYear + 1]}
        onSeasonYear={setSeasonYear}
        seasonLoading={season.loading}
        seasonError={season.error}
      />
    </section>
  );
}
