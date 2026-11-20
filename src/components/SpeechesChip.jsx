import { useI18n } from '../i18n/useI18n';
import { desktopTone } from '../lib/topBarStyles.js';

// Speeches are wanted as soon as the cartridge carries at least one speech or
// enables a non-OFF mode. Otherwise the chip is refused (red).
function resolveSpeechTone({ mode, speeches = [] }) {
  const list = speeches ?? [];
  if (list.length === 0) return 'negative';
  if (mode === 'LIGHT' || mode === 'COMPLEX') return 'positive';
  return 'negative';
}

// MC header indicator for speech readiness. The chip stays visible even when
// the cartridge has no speeches; the Speeches card itself is hidden separately.
export default function SpeechesChip({
  mode = 'OFF',
  speeches = [],
  compact = false,
  dense = false,
  className = '',
}) {
  const { t } = useI18n();
  const toneKey = resolveSpeechTone({ mode, speeches });
  const tone = desktopTone(toneKey);
  const list = speeches ?? [];
  const statusLabel = t(`speeches.mode.${mode}`);
  const description = [
    `${t('speeches.chip')}: ${statusLabel}`,
    list.length > 0 ? `${list.length}` : t('speeches.none'),
  ]
    .filter(Boolean)
    .join(' · ');

  // Pocket chip is text-only; the full mode/count/speaker stays in the
  // accessible name and tooltip.
  if (compact) {
    return (
      <div
        role="note"
        aria-label={description}
        title={description}
        className={`inline-flex items-center rounded-full px-2.5 py-1.5 font-heading text-[10px] font-bold uppercase tracking-[0.14em] shadow-sm backdrop-blur-sm ${tone} ${className}`}
      >
        <span>{t('speeches.chip')}</span>
      </div>
    );
  }

  // Dense desktop chip: label only, with the full state kept in the
  // accessible name and tooltip.
  if (dense) {
    return (
      <div
        role="note"
        aria-label={description}
        title={description}
        className={`flex min-w-0 items-center justify-center rounded-xl px-2 py-1 font-heading text-[10px] font-bold uppercase tracking-[0.12em] ${tone} ${className}`}
      >
        <span>{t('speeches.chip')}</span>
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label={description}
      title={description}
      className={`flex min-w-0 flex-wrap items-center ${
        dense
          ? 'gap-x-1.5 gap-y-0.5 rounded-xl px-2 py-1'
          : 'gap-2 rounded-2xl px-3 py-1.5'
      } ${tone} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 leading-none ${dense ? 'text-sm' : 'mt-0.5 text-lg'}`}
      >
        🗣️
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`font-heading font-semibold uppercase ${
              dense ? 'text-[10px] tracking-[0.12em]' : 'text-[11px] tracking-[0.18em]'
            }`}
          >
            {t('speeches.chip')}
          </span>
          <span
            className={`flex items-center gap-1 font-mono font-semibold ${
              dense ? 'text-[9px]' : 'text-[10px]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block rounded-full bg-current shadow-[0_0_8px_currentColor] ${
                dense ? 'h-1 w-1' : 'h-1.5 w-1.5'
              }`}
            />
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
