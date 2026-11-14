import { useI18n } from '../i18n/useI18n';

// Full-width collision / compression banner for the MC dashboard. It only
// renders for real warnings (collision or compression), not for the earlier
// "approaching" notice shown in the radar card.
export default function HardAnchorAlertBanner({ radar, actions = null }) {
  const { t } = useI18n();
  const warning = radar?.primary;
  if (!warning) return null;

  const collision = warning.status === 'collision';
  // Solid alert surfaces keep the white detail text readable in both themes.
  const tone = collision
    ? 'border-alert/80 bg-alert/90 text-on-accent'
    : 'border-amber-600/80 bg-amber-800/90 text-amber-50';

  return (
    <section
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`flex flex-wrap items-center justify-between gap-3 border-y-2 px-4 py-2.5 shadow-lg backdrop-blur-md ${tone}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="text-2xl leading-none">
          ⏰
        </span>
        <div className="min-w-0">
          <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80">
            {collision ? t('anchor.collision') : t('anchor.compression')}
          </div>
          <div className="font-heading text-sm font-bold text-on-accent">
            {warning.label} · {warning.time}
            <span className="ml-2 font-mono text-xs font-semibold">
              {collision
                ? t('anchor.overBy', { minutes: warning.overrunMinutes })
                : t('anchor.slack', { minutes: warning.slackMinutes })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
        <div className="min-w-0 text-xs text-on-accent">
          {warning.workEntry ? (
            <>
              {t('anchor.ends', {
                title: warning.workEntry.step.title,
                time: warning.workEntry.projectedEnd,
              })}{' '}
            </>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl bg-black/10 p-1">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
