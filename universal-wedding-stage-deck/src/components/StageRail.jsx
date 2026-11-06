import StageStepCard from './StageStepCard.jsx';

const DEFAULT_LABELS = {
  rail: 'Stage rail',
  done: 'Completed steps',
  current: 'Current step',
  upcoming: 'Upcoming steps',
  noDone: 'No steps completed yet.',
  noUpcoming: 'No further steps — event complete.',
  noCurrent: 'No active step.',
};

function RailList({ label, entries, variant, empty }) {
  return (
    <section aria-label={label} className="flex min-h-0 flex-col gap-2">
      <h2 className="px-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label} ({entries.length})
      </h2>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-card/40 px-3 py-2 text-[11px] text-slate-500">
          {empty}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.step?.id ?? entry.index}>
              <StageStepCard
                entry={entry}
                variant={typeof variant === 'function' ? variant(entry) : variant}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * Presentational three-zone rail: completed steps on the left, the current
 * step as the hero in the centre and upcoming steps on the right.
 *
 * Layout is pure CSS (grid + order) so there is no JS breakpoint flicker.
 * SR-03 turns the cards into accordions; SR-04 tunes the responsive grid.
 */
export default function StageRail({
  done = [],
  current = null,
  upcoming = [],
  currentBody = null,
  labels = {},
}) {
  const copy = { ...DEFAULT_LABELS, ...labels };

  return (
    <section
      aria-label={copy.rail}
      data-testid="stage-rail"
      className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start"
    >
      <div className="order-2 min-w-0 lg:order-1">
        <RailList
          label={copy.done}
          entries={done}
          variant="done"
          empty={copy.noDone}
        />
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <section aria-label={copy.current} className="flex flex-col gap-2">
          <h2 className="px-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
            {copy.current}
          </h2>
          {current ? (
            <StageStepCard entry={current} variant="current">{currentBody}</StageStepCard>
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-card/40 px-3 py-6 text-center text-xs text-slate-500">
              {copy.noCurrent}
            </p>
          )}
        </section>
      </div>

      <div className="order-3 min-w-0">
        <RailList
          label={copy.upcoming}
          entries={upcoming}
          variant={(entry) => (entry.index === upcoming[0]?.index ? 'next' : 'later')}
          empty={copy.noUpcoming}
        />
      </div>
    </section>
  );
}
