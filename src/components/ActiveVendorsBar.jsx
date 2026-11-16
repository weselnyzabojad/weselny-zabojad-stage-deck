import { useI18n } from '../i18n/useI18n';
import { buildActiveVendors } from '../lib/endHours';

// Compact horizontal vendor bar for the current-step footer. Only vendors whose
// complete start/end window contains the live event clock are rendered.
export default function ActiveVendorsBar({ wedding, nowClock }) {
  const { t } = useI18n();
  const rows = buildActiveVendors(wedding, nowClock);
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="active-vendors-title" className="flex min-w-0 flex-col gap-1.5">
      <h2
        id="active-vendors-title"
        className="px-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-muted"
      >
        {t('dj.activeVendors.title')}
      </h2>
      <ul className="flex flex-wrap gap-1.5">
        {rows.map((row) => {
          const countdown = row.remainingMinutes <= 30;
          return (
            <li
              key={row.id}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-line bg-card/80 px-2.5 py-1 text-[10px] shadow-sm"
            >
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span className="max-w-[10rem] truncate font-heading font-semibold text-ink">
                {row.name}
              </span>
              <span className="shrink-0 rounded-full border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-muted">
                {row.role}
              </span>
              <span className={`shrink-0 font-mono ${countdown ? 'text-amber-300' : 'text-muted'}`}>
                {countdown
                  ? t('dj.activeVendors.endsIn', { minutes: row.remainingMinutes })
                  : t('dj.activeVendors.until', { time: row.endTime })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
