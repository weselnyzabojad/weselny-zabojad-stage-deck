// Closure/extension information is shown only for MC and DJ VIP.
export default function WeddingClosureBanner({
  role,
  isVipDj = false,
  closureTime = null,
  extensionAllowed = false,
  lastSong = null,
}) {
  if (!closureTime) return null;
  const isMc = role === 'mc';
  const isDjVip = role === 'dj' && isVipDj;
  if (!isMc && !isDjVip) return null;

  return (
    <section className="border-b border-line bg-card px-4 py-1.5 text-[10px] text-ink">
      <span className="font-mono uppercase tracking-wider text-muted">Closure</span>{' '}
      <span className="font-mono font-semibold text-ink">{closureTime}</span>
      {extensionAllowed ? (
        <span className="ml-2 rounded border border-emerald-700 bg-emerald-950/60 px-1.5 py-0.5 text-emerald-200">
          +1h extension available
        </span>
      ) : null}
      {isDjVip && lastSong ? (
        <span className="ml-2 rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 text-brand-tint">
          Last song: {lastSong}
        </span>
      ) : null}
    </section>
  );
}
