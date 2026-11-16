import { formatCountdown } from '../lib/eventTime.js';
import { desktopTone, topBarControl } from '../lib/topBarStyles.js';

const TONES = {
  late: {
    chip: topBarControl('negative'),
    icon: '▲',
  },
  early: {
    chip: topBarControl('positive'),
    icon: '▼',
  },
  ontime: {
    chip: topBarControl('positive'),
    icon: '●',
  },
  unknown: {
    chip: topBarControl('neutral'),
    icon: '·',
  },
};

// One canonical schedule-drift pill, shared by the MC header, DJ view and
// Pocket Remote (P0.5). Red means late; green means on time and also carries
// the countdown to the next step. The tooltip explains the component values
// (start drift, projected drift, manual offset, live overrun) without showing a
// second competing number.
export default function DriftPill({ drift, size = 'md', compact = false, className = '' }) {
  const toneKey = drift?.canonicalDriftTone ?? drift?.tone ?? 'unknown';
  const rawLabel = drift?.canonicalDriftLabel ?? drift?.label ?? null;
  const lateMinutes = drift?.canonicalDriftMinutes;
  const nextStepInSec = drift?.nextStepInSec;

  // Pocket keeps the tone and tooltip but drops the "LATE / DE RETARD" wording.
  let label =
    compact && toneKey === 'late' && Number.isFinite(lateMinutes)
      ? `+${Math.abs(lateMinutes)} min`
      : rawLabel;

  // The remaining time belongs to the on-time states only. A late step keeps
  // the delay as its single headline value.
  if (toneKey !== 'late' && Number.isFinite(nextStepInSec)) {
    const countdown = formatCountdown(Math.max(0, nextStepInSec));
    label = label ? `${label} · ${countdown}` : countdown;
  }

  if (!label) return null;

  const tone = TONES[toneKey] ?? TONES.unknown;
  const desktopToneKey =
    toneKey === 'late'
      ? 'negative'
      : toneKey === 'early' || toneKey === 'ontime'
        ? 'positive'
        : 'neutral';
  // The compact pill keeps its pocket palette on time, but a late compact pill
  // adopts the laptop light-pink/red tone so the mobile MC badge matches the
  // desktop pill. Other compact states stay untouched.
  const chip = compact && toneKey !== 'late' ? tone.chip : desktopTone(desktopToneKey);
  const shape =
    compact && toneKey === 'late'
      ? 'rounded-full border'
      : compact
        ? 'rounded border-2'
        : 'rounded-2xl shadow-sm backdrop-blur-sm';
  const sizing = size === 'sm' ? 'px-2 py-1 text-[10px]' : compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <span
      title={drift?.detail || undefined}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`inline-flex items-center gap-1.5 font-semibold ${shape} ${sizing} ${chip} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`text-[9px] leading-none ${compact ? '' : 'drop-shadow-[0_0_6px_currentColor]'}`}
      >
        {tone.icon}
      </span>
      {label}
    </span>
  );
}
