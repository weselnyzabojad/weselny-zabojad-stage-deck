import { stageRailSummary } from '../lib/stageRail.js';

// Visual + label tokens per rail variant. Kept local so SR-01 stays purely
// presentational; SR-04 can tune theme tokens without touching behaviour.
const VARIANTS = {
  done: {
    card: 'border-emerald-800/60 bg-emerald-950/30 opacity-90',
    chip: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
    label: 'DONE',
  },
  current: {
    card: 'border-brand-strong bg-card ring-2 ring-brand-strong shadow-2xl',
    chip: 'border-brand-strong bg-brand/40 text-brand-tint',
    label: 'ON AIR',
  },
  next: {
    card: 'border-amber-800/60 bg-amber-950/30',
    chip: 'border-amber-800 bg-amber-950/60 text-amber-200',
    label: 'NEXT',
  },
  later: {
    card: 'border-line bg-card/70',
    chip: 'border-line-strong bg-raised text-slate-400',
    label: 'PLANNED',
  },
};

function driftTone(minutes) {
  return minutes > 0
    ? 'border-alert/60 bg-alert/20 text-alert-soft'
    : 'border-emerald-700 bg-emerald-950/60 text-emerald-300';
}

function driftLabel(entry, minutes) {
  if (!minutes) return null;
  return minutes > 0 ? `+${minutes}m` : `${Math.abs(minutes)}m ahead`;
}

/**
 * One step in the MC Stage Rail.
 *
 * Presentational only: the parent decides `variant` from
 * `buildStageRail`; SR-03 adds the expand/collapse header.
 */
export default function StageStepCard({ entry, variant = 'later' }) {
  const step = entry?.step;
  if (!step) return null;

  const meta = VARIANTS[variant] ?? VARIANTS.later;
  const summary = stageRailSummary(entry);
  const drift = entry?.projectedDriftMinutes;

  return (
    <article
      aria-label={`${userFacingLabel(variant)}: ${step.title ?? 'Step'}`}
      className={`rounded-xl border p-3 ${meta.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider ${meta.chip}`}>
              {meta.label}
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              Step {typeof entry.index === 'number' ? entry.index + 1 : '—'}
            </span>
          </div>
          <h3 className="mt-1 truncate font-heading text-sm font-semibold text-white">
            {step.title ?? '—'}
          </h3>
          <div className="mt-0.5 truncate text-[11px] text-slate-400">
            📍 {step.location ?? '—'}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 font-mono text-[11px]">
        <span className="text-slate-300">{summary}</span>
        <div className="flex items-center gap-1.5">
          {typeof step.durationMin === 'number' ? (
            <span className="text-slate-500">{step.durationMin} min</span>
          ) : null}
          {drift ? (
            <span
              title={entry.driftLabel ?? 'Projected drift vs plan'}
              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${driftTone(drift)}`}
            >
              {driftLabel(entry, drift)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function userFacingLabel(variant) {
  return VARIANTS[variant]?.label ?? VARIANTS.later.label;
}
