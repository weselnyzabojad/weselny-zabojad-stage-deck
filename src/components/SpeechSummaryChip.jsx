import { useI18n } from '../i18n/useI18n';
import SpeechesChip from './SpeechesChip';

// Non-MC speech summary (issue #928): names and relationships only, never
// scripts, PINs, translations or live state.
export default function SpeechSummaryChip({
  mode = 'OFF',
  speeches = [],
  compact = false,
  dense = false,
}) {
  const { t } = useI18n();
  if (mode == null || mode === 'OFF') return null;
  const list = Array.isArray(speeches) ? speeches : [];

  return (
    <details className="group/speech relative">
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <SpeechesChip mode={mode} speeches={list} compact={compact} dense={dense} />
      </summary>
      <div className="absolute right-0 z-raised mt-1 w-64 rounded-xl border border-line bg-card p-2 shadow-2xl">
        <p className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
          {t('speeches.summaryTitle')}
        </p>
        {list.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {list.map((speech) => (
              <li key={speech.id} className="text-xs text-ink">
                <span className="font-mono text-[9px] text-brand-soft">#{speech.order}</span>{' '}
                <span className="font-semibold">{speech.speaker?.name ?? 'Speaker'}</span>
                {speech.speaker?.relationship ? (
                  <span className="text-muted"> · {speech.speaker.relationship}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[10px] text-muted">{t('speeches.summaryEmpty')}</p>
        )}
      </div>
    </details>
  );
}
