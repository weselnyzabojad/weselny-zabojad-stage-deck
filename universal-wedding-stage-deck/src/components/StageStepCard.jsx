import { useId } from 'react';
import { useI18n } from '../i18n/useI18n';
import { stageRailSummary } from '../lib/stageRail.js';

// Visual tokens per rail variant. Behaviour (expand/collapse, keyboard, i18n)
// lives in the component; SR-04 tunes these theme tokens.
const VARIANTS = {
  done: {
    card: 'border-line border-l-4 border-l-emerald-500/70 bg-card/70 opacity-90',
    chip: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
    status: 'done',
  },
  current: {
    card: 'timeline-focus-current rounded-2xl border-2 border-brand-strong bg-card ring-2 ring-brand-strong/70',
    chip: 'border-brand-strong bg-brand/30 text-brand-soft',
    status: 'active',
  },
  next: {
    card: 'border-line border-l-4 border-l-amber-500/80 bg-card',
    chip: 'border-amber-500/40 bg-amber-500/10 text-amber-600',
    status: 'next',
  },
  later: {
    card: 'border-line border-l-4 border-l-transparent bg-card/60',
    chip: 'border-line-strong bg-raised text-slate-400',
    status: 'planned',
  },
};

function driftTone(minutes) {
  return minutes > 0
    ? 'border-alert/60 bg-alert/20 text-alert-soft'
    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600';
}

function driftLabel(minutes) {
  if (!minutes) return null;
  return minutes > 0 ? `+${minutes}m` : `${Math.abs(minutes)}m ahead`;
}

/**
 * One step in the MC Stage Rail.
 *
 * The current step is always expanded. Completed and upcoming cards are
 * accessible disclosure widgets: a header button toggles a labelled body, with
 * `aria-expanded` / `aria-controls`, a reduced-motion-safe chevron and i18n
 * labels.
 */
export default function StageStepCard({
  entry,
  variant = 'later',
  expanded = true,
  onToggle,
  collapsible = false,
  children,
}) {
  const { t } = useI18n();
  const bodyId = useId();
  const step = entry?.step;
  if (!step) return null;

  const meta = VARIANTS[variant] ?? VARIANTS.later;
  const statusLabel = t(`mc.rail.status.${meta.status}`);
  const summary = stageRailSummary(entry);
  const drift = entry?.projectedDriftMinutes;
  const title = step.title ?? '—';
  const isOpen = collapsible ? Boolean(expanded) : true;

  const header = (
    <>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider ${meta.chip}`}>
              {statusLabel}
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              Step {typeof entry.index === 'number' ? entry.index + 1 : '—'}
            </span>
          </div>
          <div className="mt-1 truncate font-heading text-sm font-semibold text-white">
            {title}
          </div>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-slate-300">{summary}</span>
      </div>
      {collapsible ? (
        <span
          aria-hidden="true"
          className={`ml-2 mt-0.5 shrink-0 text-slate-400 transition-transform duration-150 motion-reduce:transition-none ${isOpen ? 'rotate-90' : ''}`}
        >
          ▸
        </span>
      ) : null}
    </>
  );

  return (
    <article className={`rounded-xl border p-3 ${meta.card}`}>
      {collapsible ? (
        <button
          type="button"
          data-rail-card
          aria-expanded={isOpen}
          aria-controls={bodyId}
          aria-label={t(isOpen ? 'mc.rail.collapse' : 'mc.rail.expand', { title })}
          onClick={onToggle}
          className="flex w-full items-start gap-1 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft"
        >
          {header}
        </button>
      ) : (
        <div className="flex items-start gap-1">{header}</div>
      )}

      <div id={bodyId} hidden={!isOpen} className="mt-2">
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-line/60 pt-2 text-[11px] text-slate-400">
          <span className="truncate">📍 {step.location ?? '—'}</span>
          <div className="flex items-center gap-1.5 font-mono">
            {typeof step.durationMin === 'number' ? (
              <span className="text-slate-500">{step.durationMin} min</span>
            ) : null}
            {drift ? (
              <span
                title={entry.driftLabel ?? 'Projected drift vs plan'}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${driftTone(drift)}`}
              >
                {driftLabel(drift)}
              </span>
            ) : null}
            {variant === 'done' ? (
              <span className="font-mono text-[10px] text-emerald-600">{t('mc.rail.completed')}</span>
            ) : null}
          </div>
        </div>

        {children ? (
          <div className="mt-3 border-t border-line/70 pt-3">{children}</div>
        ) : null}
      </div>
    </article>
  );
}
