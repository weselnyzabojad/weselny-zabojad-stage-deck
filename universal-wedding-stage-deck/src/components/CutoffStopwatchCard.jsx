import {
  formatCountdown,
  formatDuration,
  resolveEventDateISO,
  resolveVenueTimeZone,
} from '../lib/eventTime.js';
import { activeCutoff, computeCutoffStopwatches } from '../lib/cutoff.js';

const FALLBACK_NOW = new Date(0);

const STATUS_META = {
  running: { label: 'RUNNING', chip: 'border-emerald-800 bg-emerald-950/60 text-emerald-300' },
  upcoming: { label: 'UPCOMING', chip: 'border-cyan-800 bg-cyan-950/60 text-cyan-200' },
  over: { label: 'OVER', chip: 'border-alert/60 bg-alert/20 text-alert-tint' },
  pending: { label: 'PENDING', chip: 'border-line-strong bg-raised text-muted' },
  done: { label: 'DONE', chip: 'border-line bg-page text-muted' },
};

function toneFor(seconds) {
  if (seconds == null) return 'text-muted';
  if (seconds <= 0) return 'text-alert-soft';
  if (seconds <= 300) return 'text-amber-200';
  return 'text-emerald-300';
}

// Live DJ cutoff stopwatches (TODO 4). Absolute `dj.cutoff` wins; otherwise the
// active step counts down from its ISO actual start + `dj.cutoffSec`.
export default function CutoffStopwatchCard({ timeline = [], clock, wedding }) {
  const now = clock?.now instanceof Date ? clock.now : FALLBACK_NOW;
  const eventDateISO = resolveEventDateISO(wedding);
  const timeZone = resolveVenueTimeZone(wedding);
  const stopwatches = computeCutoffStopwatches(timeline, now, { eventDateISO, timeZone });
  const active = activeCutoff(stopwatches);

  if (stopwatches.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-card p-4 shadow-lg">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
          ⏱ Cutoff stopwatch
        </h2>
        <p className="mt-2 text-xs text-muted">No DJ cutoffs in this cartridge.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-alert/40 bg-card p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-alert-soft">
          ⏱ Cutoff stopwatch
        </h2>
        <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[9px] text-muted">
          {stopwatches.length} cue{stopwatches.length === 1 ? '' : 's'}
        </span>
      </div>

      {active ? (
        <div className="mt-2 rounded-lg border border-alert/50 bg-alert/10 p-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-alert-soft">
                Active step cutoff
              </div>
              <div className="truncate font-heading text-sm font-semibold text-ink">
                {active.title}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9px] text-ink">
                Absolute
              </span>
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
            <div className={`font-mono text-2xl font-bold tabular-nums ${toneFor(active.inSec)}`}>
              {active.inSec != null ? formatCountdown(active.inSec) : 'starts with step'}
            </div>
            <div className="font-mono text-[10px] text-muted">
              cutoff {active.label}
            </div>
          </div>
        </div>
      ) : null}

      <ul className="mt-2 space-y-1.5">
        {stopwatches.map((item) => {
          const meta = STATUS_META[item.status] ?? STATUS_META.pending;
          return (
            <li
              key={item.stepId}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-[11px] ${
                item.active ? 'border-alert/50 bg-alert/10' : 'border-line bg-page'
              }`}
            >
              <div className="min-w-0">
                <div className="truncate font-heading text-xs font-semibold text-ink">
                  {item.title}
                </div>
                <div className="font-mono text-[9px] text-muted">
                  cutoff {item.label ?? '—'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 font-mono">
                <span className={`font-semibold tabular-nums ${toneFor(item.inSec)}`}>
                  {item.inSec != null ? formatCountdown(item.inSec) : '—'}
                </span>
                <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${meta.chip}`}>
                  {meta.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[10px] leading-snug text-muted">
        Absolute cutoff wins when both are set. Relative cutoffs count from the step&apos;s
        actual start (ISO timestamp), not the planned time.
      </p>
    </section>
  );
}
