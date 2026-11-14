// Shared secondary control bar below the role top bar.
//
// Left: Late / PIN / Sync. Centre: Children expected. Right: theme, language,
// Open on phone. Role views pass only the controls their role may use.
export default function SecondaryControlBar({
  left = null,
  center = null,
  right = null,
  className = '',
}) {
  if (!left && !center && !right) return null;

  return (
    <div
      className={`border-b border-panel-border bg-panel/70 px-4 py-2 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-panel/55 ${className}`}
    >
      {/* Compact: stacked rows so controls stay readable at 360px. Wide:
          the original 1fr / auto / 1fr composition. */}
      <div className="grid w-full grid-cols-1 items-center gap-1.5 sm:grid-cols-[1fr_auto_1fr] sm:gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">{left}</div>
        <div className="flex min-w-0 items-center justify-start sm:justify-center">{center}</div>
        <div className="flex min-w-0 flex-wrap items-center justify-start gap-1.5 sm:justify-end">{right}</div>
      </div>
    </div>
  );
}
