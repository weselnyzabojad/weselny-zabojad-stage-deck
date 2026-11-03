// Sun/moon theme switch (TODO 27). Accessible toggle that only changes this
// device's theme; it is never synced to other roles.
export default function ThemeToggle({ theme = 'night', onToggle, compact = false, className = '' }) {
  const isDay = theme === 'day';
  const label = isDay ? 'Switch to Night Stage (dark)' : 'Switch to Daylight (light)';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDay}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded border border-line bg-raised px-2.5 py-1 text-xs text-ink transition hover:border-line-strong ${className}`}
    >
      <span aria-hidden="true" className="text-sm leading-none">
        {isDay ? '☀️' : '🌙'}
      </span>
      {compact ? null : (
        <span className="font-heading font-semibold">{isDay ? 'Daylight' : 'Night Stage'}</span>
      )}
    </button>
  );
}
