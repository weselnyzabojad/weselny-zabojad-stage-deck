const TONES = {
  late: {
    chip: 'border-alert/60 bg-alert/20 text-alert-soft',
    icon: '▲',
  },
  early: {
    chip: 'border-emerald-700 bg-emerald-950/60 text-emerald-300',
    icon: '▼',
  },
  ontime: {
    chip: 'border-line-strong bg-raised text-slate-200',
    icon: '●',
  },
  unknown: {
    chip: 'border-line-strong bg-raised text-slate-400',
    icon: '·',
  },
};

// One canonical schedule-drift pill, shared by the MC header, DJ view and
// Pocket Remote (P0.5). The tooltip explains the component values
// (start drift, projected drift, manual offset, live overrun) without showing a
// second competing number.
export default function DriftPill({ drift, size = 'md', className = '' }) {
  const label = drift?.canonicalDriftLabel ?? drift?.label ?? null;
  if (!label) return null;

  const tone = TONES[drift?.canonicalDriftTone ?? drift?.tone ?? 'unknown'] ?? TONES.unknown;
  const sizing = size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-sm';

  return (
    <span
      title={drift?.detail || undefined}
      className={`inline-flex items-center gap-1.5 rounded border font-semibold ${sizing} ${tone.chip} ${className}`}
    >
      <span aria-hidden="true" className="text-[9px] leading-none">
        {tone.icon}
      </span>
      {label}
    </span>
  );
}
