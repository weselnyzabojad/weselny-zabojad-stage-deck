import { useId } from 'react';
import { useI18n } from '../i18n/useI18n';
import { stageRailSummary } from '../lib/stageRail.js';

// Visual tokens per rail variant. Behaviour (expand/collapse, keyboard, i18n)
// lives in the component; SR-04 tunes these theme tokens.
const VARIANTS = {
  done: {
    card: 'border-line border-l-4 border-l-emerald-500/70 bg-card',
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
    chip: 'border-line-strong bg-raised text-muted',
    status: 'planned',
  },
};

// MC Master-only visual refinement (#713). Other role views keep VARIANTS so
// their existing layouts are untouched.
const POLISHED_VARIANTS = {
  done: {
    card: 'border-line border-l-4 border-l-emerald-500/70 bg-emerald-500/5 shadow-sm',
    chip: 'border-tone-positive-border bg-tone-positive-bg text-tone-positive-text',
    status: 'done',
  },
  current: {
    card: 'timeline-focus-current rounded-2xl border-2 border-brand-strong bg-card shadow-lg ring-1 ring-brand-strong/40',
    chip: 'border-brand-strong/60 bg-brand/15 text-brand-soft shadow-sm',
    status: 'active',
  },
  next: {
    card: 'border-line border-l-4 border-l-amber-500/70 bg-amber-500/5 shadow-sm',
    chip: 'border-tone-warning-border bg-tone-warning-bg text-tone-warning-text',
    status: 'next',
  },
  later: {
    card: 'border-line bg-card/60 shadow-sm',
    chip: 'border-line bg-raised/60 text-muted',
    status: 'planned',
  },
};

function driftTone(minutes) {
  return minutes > 0
    ? 'border-alert/60 bg-alert/20 text-alert-soft'
    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600';
}

function polishedDriftTone(minutes) {
  return minutes > 0
    ? 'border-tone-negative-border bg-tone-negative-bg text-tone-negative-text'
    : 'border-tone-positive-border bg-tone-positive-bg text-tone-positive-text';
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
  photographerAvailable = null,
  polished = false,
  children,
}) {
  const { t } = useI18n();
  const bodyId = useId();
  const step = entry?.step;
  if (!step) return null;

  const variants = polished ? POLISHED_VARIANTS : VARIANTS;
  const meta = variants[variant] ?? variants.later;
  const statusLabel = t(`mc.rail.status.${meta.status}`);
  const summary = stageRailSummary(entry);
  const drift = entry?.projectedDriftMinutes;
  const title = step.title ?? '—';
  const isOpen = collapsible ? Boolean(expanded) : true;
  const headerWrapperClass = `flex w-full items-start gap-1 ${
    variant === 'current' ? 'current-step-header' : ''
  }`;

  const header = (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`${polished ? 'rounded-full px-2 py-0.5 shadow-sm' : 'rounded px-1.5 py-0.5'} border font-mono text-[9px] font-bold tracking-wider ${meta.chip}`}
            >
              {statusLabel}
            </span>
            {step.game?.requiresPhotographer ? (
              <span
                className={`${polished ? 'rounded-full px-2' : 'rounded px-1.5'} border border-amber-500/40 bg-amber-500/10 py-0.5 font-mono text-[9px] font-bold text-amber-600`}
              >
                {t('mc.rail.requiresPhotographer')}
              </span>
            ) : null}
            {step.game?.requiresPhotographer && photographerAvailable === false ? (
              <span
                className={`${polished ? 'rounded-full px-2' : 'rounded px-1.5'} border border-alert/60 bg-alert/20 py-0.5 font-mono text-[9px] font-bold text-alert-soft`}
              >
                {t('mc.rail.noPhotographer')}
              </span>
            ) : null}
          </div>
          <div className="mt-1 line-clamp-2 break-words font-heading text-sm font-semibold text-ink">
            {title}
          </div>
        </div>
        <span
          className={`shrink-0 ${
            polished
              ? 'font-heading text-sm font-semibold text-ink'
              : 'font-mono text-[11px] text-ink'
          }`}
        >
          {summary}
        </span>
      </div>
      {collapsible ? (
        <span
          aria-hidden="true"
          className={`ml-2 mt-0.5 shrink-0 text-muted transition-transform duration-150 motion-reduce:transition-none ${isOpen ? 'rotate-90' : ''}`}
        >
          ▸
        </span>
      ) : null}
    </>
  );

  return (
    <article
      className={`${polished ? 'rounded-2xl border p-3.5 transition-shadow' : 'rounded-xl border p-3'} ${meta.card}`}
    >
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
          <div className={headerWrapperClass}>{header}</div>
        </button>
      ) : (
        <div className={headerWrapperClass}>{header}</div>
      )}

      <div
        id={bodyId}
        hidden={!isOpen}
        className={`mt-2 ${variant === 'current' ? 'current-step-body' : ''}`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-1.5 border-t pt-2 text-[11px] text-muted ${polished ? 'border-line/70' : 'border-line/60'}`}
        >
          <span className="truncate">📍 {step.location ?? '—'}</span>
          <div className="flex items-center gap-1.5 font-mono">
            {drift ? (
              <span
                title={entry.driftLabel ?? 'Projected drift vs plan'}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${polished ? polishedDriftTone(drift) : driftTone(drift)}`}
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
