import { buildEndHours, formatEndHour } from '../lib/endHours';
import { instrumentLabel } from '../lib/instruments.js';
import { useI18n } from '../i18n/useI18n';

// One compact, read-only card for the Standard DJ: every musician and media
// role with a known end hour, sorted by departure time. VIP owns its own lane.
export default function EndHoursCard({ wedding }) {
  const { t, locale } = useI18n();
  const rows = buildEndHours(wedding);
  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="end-hours-title"
      className="rounded-xl border border-line bg-card p-4 shadow-lg"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="end-hours-title"
          className="font-heading text-xs font-bold uppercase tracking-widest text-ink"
        >
          {t('dj.endHours.title')}
        </h2>
        <span className="font-mono text-[10px] text-muted">
          {t('dj.endHours.count', { count: rows.length })}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-muted">{t('dj.endHours.hint')}</p>
      <ul className="mt-3 divide-y divide-line/70">
        {rows.map((row) => (
          <li key={row.id} className="flex items-baseline justify-between gap-3 py-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-heading text-[11px] font-semibold text-ink">{row.name}</span>
                <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-muted">
                  {row.role}
                </span>
                {row.instrument ? (
                  <span className="text-[10px] text-muted">
                    {instrumentLabel(row.instrument, locale)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono text-sm font-bold text-ink">{formatEndHour(row)}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted">
                {t('dj.endHours.leavesAt')}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
