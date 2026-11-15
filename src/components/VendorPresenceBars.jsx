import { useI18n } from '../i18n/useI18n';
import { buildVendorPresence, formatEndHour } from '../lib/endHours';

// Read-only vendor presence stack for the DJ current column. Rows are derived
// from the cartridge and disappear once the live event clock passes their end.
export default function VendorPresenceBars({ wedding, nowClock }) {
  const { t } = useI18n();
  const rows = buildVendorPresence(wedding, nowClock);
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="vendor-presence-title" className="flex flex-col gap-2">
      <h2
        id="vendor-presence-title"
        className="px-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-muted"
      >
        {t('dj.vendorPresence.title')}
      </h2>
      <ul className="grid gap-1.5">
        {rows.map((row) => {
          const active = row.state === 'active';
          return (
            <li
              key={row.id}
              className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-card/80 px-3 py-2 shadow-sm"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${
                  active ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-heading text-[11px] font-semibold text-ink">
                  {row.name}
                  <span className="font-body font-normal text-muted"> · {row.role}</span>
                </div>
                <div className="font-mono text-[10px] text-muted">{formatEndHour(row)}</div>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${
                  active
                    ? 'border-emerald-800 bg-emerald-950/60 text-emerald-300'
                    : 'border-amber-700 bg-amber-950/60 text-amber-200'
                }`}
              >
                {active ? t('dj.vendorPresence.active') : t('dj.vendorPresence.upcoming')}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
