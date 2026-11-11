// Shared three-zone top-bar shell used by every role view so layout, spacing
// and vertical alignment cannot drift between roles.
export default function TopBarShell({ left, center, right, className = '' }) {
  return (
    <header
      className={`bg-panel/85 supports-[backdrop-filter]:bg-panel/70 border-b border-panel-border px-4 py-3 grid grid-cols-1 gap-4 text-xs font-heading tracking-wide shadow-sm backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center ${className}`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">{left}</div>
      <div className="flex min-w-0 items-center justify-center">{center}</div>
      <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 lg:justify-end">
        {right}
      </div>
    </header>
  );
}
