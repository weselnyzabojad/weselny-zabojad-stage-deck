import { buildEndHours, formatEndHour, lanePositionPercent } from '../lib/endHours';
import { useI18n } from '../i18n/useI18n';

// VIP-only visual rail (issue #995). Markers are presentation data derived from
// the cartridge; they are never timeline steps and never enter drift, progress,
// anchors or exports. Keep this component read-only.
export default function DjEndHourLane({ wedding }) {
  const { t } = useI18n();
  const rows = buildEndHours(wedding);
  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="dj-end-hour-lane-title"
      data-testid="dj-end-hour-lane"
      className="rounded-xl border border-dashed border-line-strong bg-card/60 p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="dj-end-hour-lane-title"
          className="font-heading text-[10px] font-bold uppercase tracking-widest text-muted"
        >
          {t('dj.endHourLane.title')}
        </h2>
        <span className="font-mono text-[9px] text-muted">{t('dj.endHourLane.hint')}</span>
      </div>
      <div className="mt-2 overflow-x-auto pb-1">
        <ol className="relative h-24 min-w-[36rem] border-t border-line/70">
          {rows.map((row, index) => (
            <li
              key={row.id}
              aria-label={`${row.name}, ${row.role}, ${formatEndHour(row)}`}
              title={`${row.name} — ${row.role}${row.instrument ? ` (${row.instrument})` : ''} — ${formatEndHour(row)}`}
              className="absolute w-32 -translate-x-1/2"
              style={{
                left: `${lanePositionPercent(row.sortValue)}%`,
                top: index % 2 === 0 ? '0.5rem' : '3.25rem',
              }}
            >
              <span
                aria-hidden="true"
                className="mx-auto block h-2 w-2 rounded-full border border-brand-strong bg-brand"
              />
              <div className="mt-1 rounded border border-line bg-page/90 px-1.5 py-1 text-center">
                <div className="truncate font-heading text-[10px] font-semibold text-ink">
                  {row.name}
                </div>
                <div className="truncate text-[9px] text-muted">
                  {row.role}
                  {row.instrument ? ` · ${row.instrument}` : ''}
                </div>
                <div className="font-mono text-[10px] font-bold text-ink">
                  {formatEndHour(row)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
