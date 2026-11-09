import { useEffect, useState } from 'react';
import {
  STAGE_PINGS,
  STAGE_PING_HOLD_MS,
  isStagePingFresh,
  stagePingVisibleMs,
} from '../lib/stagePings';
import { useI18n } from '../i18n/useI18n';

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Full-width flashing banner on the DJ device. It is intentionally loud enough
// to read from across a noisy room, and auto-clears so it cannot linger.
//
// The parent keys this component by `ping.id`, so every new cue remounts it
// with a fresh countdown and a clean dismissed flag.
export default function StagePingBanner({ ping, step }) {
  const { t, formatTime } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const pingType = ping?.type;
  const meta = pingType ? STAGE_PINGS[pingType] : null;
  const visible = Boolean(ping && meta && !dismissed && isStagePingFresh(ping));

  useEffect(() => {
    if (!visible || !pingType) return undefined;
    const timer = setTimeout(() => setDismissed(true), stagePingVisibleMs(pingType));
    return () => clearTimeout(timer);
  }, [visible, pingType]);

  useEffect(() => {
    if (!visible || pingType !== 'hold_2m') return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [visible, pingType]);

  if (!visible || !meta) return null;

  const sentAt = Date.parse(ping.sent_at);
  const elapsed = Math.max(0, now - Math.min(sentAt, now));
  const remaining = pingType === 'hold_2m' ? Math.max(0, STAGE_PING_HOLD_MS - elapsed) : null;
  const track = pingType === 'drop_track' ? step?.dj?.track : null;

  return (
    <section
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="stage-ping-flash relative z-20 flex flex-wrap items-center justify-between gap-3 border-y-2 border-alert-tint px-4 py-3 text-on-accent shadow-2xl"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="text-3xl leading-none">
          {meta.icon}
        </span>
        <div className="min-w-0">
          <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.3em] text-on-accent/80">
            {t('ping.header')}
          </div>
          <div className="font-heading text-2xl font-black leading-tight tracking-wide">
            {meta.banner}
          </div>
          {track ? (
            <div className="mt-0.5 truncate font-mono text-xs text-on-accent/90">🎵 {track}</div>
          ) : null}
          {remaining != null ? (
            <div className="mt-0.5 font-mono text-sm font-bold">
              {t('ping.remaining', { time: formatRemaining(remaining) })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="text-right font-mono text-xs text-on-accent/80">
        <div>{formatTime(ping.sent_at)}</div>
        <div className="text-[10px] uppercase tracking-wider">{t('ping.autoClears')}</div>
      </div>
    </section>
  );
}
