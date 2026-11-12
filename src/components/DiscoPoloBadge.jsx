import { useI18n } from '../i18n/useI18n';

const TONES = {
  NO: 'border-red-600 bg-red-950/60 text-red-200',
  YES: 'border-emerald-600 bg-emerald-950/60 text-emerald-200',
  ON_REQUEST: 'border-amber-600 bg-amber-950/60 text-amber-200',
};

const DOTS = {
  NO: 'bg-red-400',
  YES: 'bg-emerald-400',
  ON_REQUEST: 'bg-amber-400',
};

// Display-only policy badge. It never enforces a play count; the DJ reads it as
// guidance. Absent/invalid values fail closed to NO.
export default function DiscoPoloBadge({ value = 'NO', compact = false }) {
  const { t } = useI18n();
  const policy = TONES[value] ? value : 'NO';
  const label = t(`music.discoPolo.${policy}`);
  const description = t(`music.discoPolo.description.${policy}`);

  return (
    <span
      role="note"
      aria-label={`${label}. ${description}`}
      title={`${label}. ${description}`}
      className={`inline-flex items-center gap-1.5 rounded border font-mono font-bold ${
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'
      } ${TONES[policy]}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOTS[policy]}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
