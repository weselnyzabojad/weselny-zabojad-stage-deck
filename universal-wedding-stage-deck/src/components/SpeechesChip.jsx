import { useI18n } from '../i18n/useI18n';

const TONES = {
  off: {
    chip: 'border-alert/60 bg-alert/15',
    text: 'text-alert-soft',
    dot: 'bg-alert',
  },
  light: {
    chip: 'border-amber-700/70 bg-amber-950/70',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
  },
  complex: {
    chip: 'border-emerald-700/70 bg-emerald-950/60',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  live: {
    chip: 'border-brand-strong bg-brand/30 ring-1 ring-brand-strong/50',
    text: 'text-brand-tint',
    dot: 'bg-brand-tint',
  },
};

function resolveSpeechTone({ mode, speeches = [], activeSpeechId = null }) {
  const list = speeches ?? [];
  if (list.length === 0) return 'off';
  if (activeSpeechId && list.some((speech) => speech?.id === activeSpeechId)) return 'live';
  if (mode === 'LIGHT') return 'light';
  if (mode === 'COMPLEX') return 'complex';
  return 'off';
}

// MC header indicator for speech readiness. The chip stays visible even when
// the cartridge has no speeches; the Speeches card itself is hidden separately.
export default function SpeechesChip({
  mode = 'OFF',
  speeches = [],
  activeSpeechId = null,
  compact = false,
  className = '',
}) {
  const { t } = useI18n();
  const toneKey = resolveSpeechTone({ mode, speeches, activeSpeechId });
  const tone = TONES[toneKey];
  const list = speeches ?? [];
  const activeSpeech = activeSpeechId
    ? list.find((speech) => speech?.id === activeSpeechId) ?? null
    : null;
  const statusLabel = toneKey === 'live' ? t('speeches.live') : mode;
  const description = [
    `${t('speeches.chip')}: ${statusLabel}`,
    list.length > 0 ? `${list.length}` : t('speeches.none'),
    activeSpeech?.speaker?.name ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      role="note"
      aria-label={description}
      title={description}
      className={`flex items-center gap-2 rounded-lg border ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5 items-start'} ${tone.chip} ${className}`}
    >
      <span aria-hidden="true" className={`text-sm leading-none ${compact ? '' : 'mt-0.5'}`}>
        🗣️
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-[10px] font-bold uppercase tracking-widest text-ink">
            {t('speeches.chip')}
          </span>
          {compact ? (
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 rounded-full ${tone.dot}`}
            />
          ) : (
            <span className={`flex items-center gap-1 font-mono text-[10px] font-bold ${tone.text}`}>
              <span
                aria-hidden="true"
                className={`inline-block h-1.5 w-1.5 rounded-full ${tone.dot}`}
              />
              {statusLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
