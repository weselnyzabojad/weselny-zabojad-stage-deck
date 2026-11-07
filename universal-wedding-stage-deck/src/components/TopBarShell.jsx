// Shared three-zone top-bar shell used by every role view so layout, spacing
// and vertical alignment cannot drift between roles.
export default function TopBarShell({ left, center, right, className = '' }) {
  return (
    <header
      className={`bg-card border-b border-line px-4 py-3 grid grid-cols-1 gap-4 text-xs font-heading tracking-wide xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-center ${className}`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">{left}</div>
      <div className="flex min-w-0 items-center justify-center">{center}</div>
      <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 xl:justify-end">
        {right}
      </div>
    </header>
  );
}
