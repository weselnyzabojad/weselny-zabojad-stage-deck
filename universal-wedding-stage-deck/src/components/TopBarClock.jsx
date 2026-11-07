export default function TopBarClock({ clock, className = '' }) {
  if (!clock?.nowClock) return null;

  return (
    <span
      className={`font-mono text-2xl leading-none font-semibold tabular-nums text-white ${className}`}
      aria-label="Current time"
      title="Current time"
    >
      {clock.nowClock}
    </span>
  );
}
