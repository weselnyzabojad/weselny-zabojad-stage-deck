import TimelineFocusStack from './TimelineFocusStack.jsx';

/**
 * Backwards-compatible adapter for the former MC-only stage rail.
 *
 * New code should use `TimelineFocusStack` directly with drift entries and an
 * active index. This adapter keeps the old `done` / `current` / `upcoming`
 * prop shape working while rendering the shared focus-stack rules.
 */
export default function StageRail({
  done = [],
  current = null,
  upcoming = [],
  currentBody = null,
  labels = {},
}) {
  // `done` is nearest-first; rebuild the chronological entry list expected by
  // the focus-stack helper.
  const entries = [...done].reverse();
  if (current) entries.push(current);
  entries.push(...upcoming);

  return (
    <TimelineFocusStack
      entries={entries}
      activeIndex={current ? done.length : -1}
      currentBody={currentBody}
      labels={labels}
    />
  );
}
