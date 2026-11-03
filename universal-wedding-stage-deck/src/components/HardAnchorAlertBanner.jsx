// Full-width collision / compression banner for the MC dashboard. It only
// renders for real warnings (collision or compression), not for the earlier
// "approaching" notice shown in the radar card.
export default function HardAnchorAlertBanner({ radar }) {
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
            {collision ? 'Hard anchor collision' : 'Hard anchor compression'}
          </div>
          <div className="font-heading text-sm font-bold text-white">
            {warning.label} at {warning.time}
            <span className="ml-2 font-mono text-xs font-semibold">
              {collision ? `${warning.overrunMinutes}m over` : `${warning.slackMinutes}m slack`}
            </span>
          </div>
        </div>
      </div>

      <div className="min-w-0 text-xs opacity-90">
        {warning.workEntry ? (
          <>
            {warning.workEntry.step.title} ends {warning.workEntry.projectedEnd}.{' '}
          </>
        ) : null}
        Swap or defer a block.
      </div>
    </section>
  );
}
