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
    <div className={`border-b border-line bg-card/95 px-4 py-1.5 ${className}`}>
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">{left}</div>
        <div className="flex items-center justify-center">{center}</div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">{right}</div>
      </div>
    </div>
  );
}
