import { useI18n } from '../i18n/useI18n';

// Full-width collision / compression banner for the MC dashboard. It only
// renders for real warnings (collision or compression), not for the earlier
// "approaching" notice shown in the radar card.
export default function HardAnchorAlertBanner({ radar, actions = null, childrenExpected = false }) {
  const { t } = useI18n();
  const warning = radar?.primary;
  if (!warning) return null;

  const collision = warning.status === 'collision';
  const tone = collision
    ? 'border-alert/80 bg-alert/25 text-alert-tint'
    : 'border-amber-600/80 bg-amber-950/80 text-amber-100';

  return (
    <section
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`flex flex-wrap items-center justify-between gap-3 border-y-2 px-4 py-2 shadow-lg ${tone}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="text-2xl leading-none">
          ⏰
        </span>
        <div className="min-w-0">
          <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80">
            {collision ? t('anchor.collision') : t('anchor.compression')}
          </div>
          <div className="font-heading text-sm font-bold text-white">
            {warning.label} · {warning.time}
            <span className="ml-2 font-mono text-xs font-semibold">
              {collision
                ? t('anchor.overBy', { minutes: warning.overrunMinutes })
                : t('anchor.slack', { minutes: warning.slackMinutes })}
            </span>
          </div>
        </div>
      </div>

      {childrenExpected ? (
        <div className="mx-auto rounded border border-amber-300/60 bg-amber-900/50 px-2 py-1 text-center text-[11px] font-semibold text-amber-100">
          🧒 Children expected — keep them clear of key moments.
        </div>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
        <div className="min-w-0 text-xs text-white">
          {warning.workEntry ? (
            <>
              {t('anchor.ends', {
                title: warning.workEntry.step.title,
                time: warning.workEntry.projectedEnd,
              })}{' '}
            </>
          ) : null}
          {t('anchor.swapOrDefer')}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
