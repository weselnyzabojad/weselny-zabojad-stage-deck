const OVERALL_META = {
  collision: {
    label: 'COLLISION',
    chip: 'border-alert/70 bg-alert/25 text-alert-tint',
    border: 'border-alert/60',
  },
  compression: {
    label: 'WATCH',
    chip: 'border-amber-700 bg-amber-950/70 text-amber-200',
    border: 'border-amber-800/70',
  },
  approaching: {
    label: 'APPROACHING',
    chip: 'border-cyan-800 bg-cyan-950/60 text-cyan-200',
    border: 'border-cyan-900/70',
  },
  safe: {
    label: 'SAFE',
    chip: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
    border: 'border-emerald-900/70',
  },
  empty: {
    label: 'NO ANCHORS',
    chip: 'border-line-strong bg-raised text-slate-400',
    border: 'border-line',
  },
};

const ROW_META = {
  collision: {
    label: 'COLLISION',
    chip: 'border-alert/70 bg-alert/25 text-alert-tint',
    border: 'border-alert/50',
    value: 'text-alert-soft',
  },
  compression: {
    label: 'WATCH',
    chip: 'border-amber-700 bg-amber-950/70 text-amber-200',
    border: 'border-amber-800/60',
    value: 'text-amber-300',
  },
  approaching: {
    label: 'SOON',
    chip: 'border-cyan-800 bg-cyan-950/60 text-cyan-200',
    border: 'border-cyan-900/60',
    value: 'text-cyan-300',
  },
  safe: {
    label: 'SAFE',
    chip: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
    border: 'border-emerald-900/60',
    value: 'text-emerald-300',
  },
  passed: {
    label: 'PASSED',
    chip: 'border-line-strong bg-raised text-slate-400',
    border: 'border-line',
    value: 'text-slate-500',
  },
  unknown: {
    label: 'UNKNOWN',
    chip: 'border-line-strong bg-raised text-slate-400',
    border: 'border-line',
    value: 'text-slate-500',
  },
};

function slackLabel(report) {
  if (report.status === 'collision') return `${report.overrunMinutes}m over`;
  if (report.slackMinutes != null) return `${report.slackMinutes}m slack`;
  return '—';
}

// Fixed-deadline radar for the MC dashboard. Every anchor is listed with the
// projected end of the last block before it, plus the remaining slack.
export default function HardAnchorRadar({ radar }) {
  if (!radar) return null;

  const overall = OVERALL_META[radar.status] ?? OVERALL_META.empty;

  return (
    <section
      id="hard-anchor-radar"
      className={`scroll-mt-4 rounded-xl border bg-card/95 p-4 shadow-lg ${overall.border}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
          🚨 Hard Anchor Radar
        </h2>
        <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider ${overall.chip}`}>
          {overall.label}
        </span>
      </div>

      {radar.primary ? (
        <div
          role="alert"
          className={`mt-2 rounded-lg border p-2.5 text-[11px] leading-snug ${
            radar.primary.status === 'collision'
              ? 'border-alert/60 bg-alert/20 text-alert-tint'
              : 'border-amber-700/70 bg-amber-950/50 text-amber-100'
          }`}
        >
          {radar.primary.message}
        </div>
      ) : null}

      <div className="mt-2 space-y-2">
        {radar.anchors.map((report) => {
          const meta = ROW_META[report.status] ?? ROW_META.unknown;
          return (
            <div
              key={report.id}
              id={`anchor-${report.id}`}
              className={`scroll-mt-4 rounded-lg border bg-page/70 p-2.5 ${meta.border}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-heading text-xs font-semibold text-white">
                    🔒 {report.label}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {report.time}
                    {report.workEntry ? ` · work ends ${report.workEntry.projectedEnd}` : ''}
                  </div>
                  {report.workEntry ? (
                    <div className="mt-0.5 truncate text-[10px] text-slate-500">
                      {report.workEntry.step.title}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${meta.chip}`}>
                    {meta.label}
                  </span>
                  <div className={`mt-1 font-mono text-[10px] font-semibold ${meta.value}`}>
                    {slackLabel(report)}
                  </div>
                  {report.status === 'approaching' && report.minutesToAnchor != null ? (
                    <div className="font-mono text-[9px] text-cyan-300">
                      in ~{report.minutesToAnchor}m
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] leading-snug text-slate-500">
        Anchors never move. Warnings appear when projected work leaves 10 minutes or less, or when
        an anchor is inside its alert window.
      </p>
    </section>
  );
}
