import { formatCountdown, formatDuration } from '../lib/eventTime.js';

const TONE = {
  normal: 'text-white',
  good: 'text-emerald-300',
  warn: 'text-amber-200',
  bad: 'text-alert-soft',
};

function Metric({ label, value, tone = 'normal', title }) {
  return (
    <div className="rounded-lg border border-line bg-page" title={title}>
      <div className="px-2 pt-1.5 text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`px-2 pb-1.5 font-mono text-sm font-semibold tabular-nums ${TONE[tone]}`}>
        {value}
      </div>
    </div>
  );
}

function Chip({ label, value, tone = 'normal', title }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded border border-line-strong bg-raised px-1.5 py-0.5"
    >
      <span className="text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`font-semibold tabular-nums ${TONE[tone]}`}>{value}</span>
    </span>
  );
}

function SkewWarning({ clock }) {
  if (!clock.isClockSkewed) return null;
  const seconds = Math.round(clock.clockSkewMs / 1000);
  return (
    <p
      role="status"
      className="mt-2 rounded border border-amber-700 bg-amber-950/60 px-2 py-1 text-[10px] font-semibold text-amber-200"
    >
      ⚠ Clock skew: this device is {seconds}s off the server clock. Times use the
      corrected clock.
    </p>
  );
}

function CutoffTone(cutoff) {
  if (!cutoff) return 'normal';
  if (cutoff.inSec <= 0) return 'bad';
  if (cutoff.inSec <= 300) return 'warn';
  return 'normal';
}

// Real-time reel clock (P0.6 / Phase 1.5). Static markup only; the parent
// supplies a ticking `clock` from `useEventClock` + `buildDriftReport`.
export default function ReelClock({ clock, compact = false }) {
  if (!clock) return null;

  const active = clock.active;
  const remainingSec = active?.remainingSec ?? null;
  const overrun = remainingSec != null && remainingSec < 0;
  const cutoffTone = CutoffTone(clock.djCutoff);
  const anchorLabel = clock.nextAnchor
    ? `${clock.nextAnchor.label} · ${formatCountdown(clock.nextAnchor.inSec)}`
    : '—';
  const cutoffLabel = clock.djCutoff
    ? `${clock.djCutoff.label} · ${formatCountdown(clock.djCutoff.inSec)}`
    : '—';

  if (compact) {
    return (
      <section
        aria-label="Real-time reel clock"
        className="rounded-xl border border-brand-strong/60 bg-card p-3 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-[9px] font-semibold uppercase tracking-widest text-brand-soft">
              ⏱ Reel clock
            </span>
            <span className="font-mono text-2xl font-bold tabular-nums text-white">
              {clock.nowClock}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
            <Chip
              label="Elapsed"
              value={active?.elapsedSec != null ? formatDuration(active.elapsedSec) : '—'}
            />
            <Chip
              label={overrun ? 'Overrun' : 'Left'}
              value={remainingSec != null ? formatDuration(remainingSec) : '—'}
              tone={remainingSec == null ? 'normal' : overrun ? 'bad' : 'good'}
            />
            <Chip label="DJ cutoff" value={cutoffLabel} tone={cutoffTone} />
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-slate-400">
          <Chip label="Finish" value={clock.projectedFinish ?? '—'} />
          <Chip label="Next anchor" value={anchorLabel} />
          <span className="text-slate-600">{clock.timeZone}</span>
        </div>
        <SkewWarning clock={clock} />
      </section>
    );
  }

  return (
    <section
      aria-label="Real-time reel clock"
      className="rounded-xl border border-brand-strong/60 bg-card p-4 shadow-lg"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-soft">
            ⏱ Reel clock
          </div>
          <div className="font-mono text-4xl font-bold leading-none tabular-nums text-white">
            {clock.nowClock}
          </div>
          <div className="mt-1 truncate font-heading text-sm font-semibold text-slate-200">
            {active ? active.title : clock.isComplete ? 'Event complete' : 'Event in progress'}
          </div>
        </div>
        <span className="rounded border border-line-strong bg-raised px-2 py-0.5 font-mono text-[9px] text-slate-400">
          {clock.timeZone}
        </span>
      </div>

      <SkewWarning clock={clock} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric
          label="Elapsed in step"
          value={active?.elapsedSec != null ? formatDuration(active.elapsedSec) : '—'}
          title="Time since the active step started"
        />
        <Metric
          label={overrun ? 'Overrun' : 'Remaining'}
          value={remainingSec != null ? formatDuration(remainingSec) : '—'}
          tone={remainingSec == null ? 'normal' : overrun ? 'bad' : 'good'}
          title="Live overrun vs the projected end of the active step"
        />
        <Metric
          label="Projected finish"
          value={clock.projectedFinish ?? '—'}
          title="Projected end of the last step"
        />
        <Metric
          label="Next anchor"
          value={clock.nextAnchor ? formatCountdown(clock.nextAnchor.inSec) : '—'}
          tone={
            clock.nextAnchor && clock.nextAnchor.inSec <= 0
              ? 'bad'
              : clock.nextAnchor && clock.nextAnchor.inSec <= 600
                ? 'warn'
                : 'normal'
          }
          title={clock.nextAnchor?.label ?? 'No upcoming hard anchor'}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px]">
        <Chip label="Anchor" value={clock.nextAnchor?.label ?? '—'} />
        <Chip
          label="DJ cutoff"
          value={cutoffLabel}
          tone={cutoffTone}
          title={
            clock.djCutoff?.source === 'relative'
              ? 'Derived from the actual start + cutoffSec'
              : 'Absolute cutoff time'
          }
        />
      </div>
    </section>
  );
}
