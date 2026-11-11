import { useI18n } from '../i18n/useI18n';

const MODE_CHIPS = {
  OFF: 'border-line-strong bg-raised text-muted',
  LIGHT: 'border-cyan-800 bg-cyan-950/60 text-cyan-200',
  COMPLEX: 'border-brand-strong bg-brand/30 text-brand-tint',
};

// MC-only speech list. The dedicated speaker device reads the active speech id
// from live sync; the MC card is read-only.
export default function SpeechesCard({ mode, speeches }) {
  const { t } = useI18n();
  // No speeches means no below-timeline card at all; the MC top-bar chip still
  // communicates the OFF/no-speech state.
  if (!speeches?.length) return null;

  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
          🗣️ {t('speeches.title')}
        </h2>
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider ${
            MODE_CHIPS[mode] ?? MODE_CHIPS.OFF
          }`}
        >
          {t(`speeches.mode.${mode}`)}
        </span>
      </div>

      {mode === 'OFF' ? (
        <p className="mt-2 text-xs text-muted">{t('speeches.offBody')}</p>
      ) : null}

      <ol className="mt-2 space-y-2">
        {speeches.map((speech) => {
            const missingComplexScript = speech.mode === 'COMPLEX' && !speech.script.ready;
            return (
              <li
                key={speech.id}
                className="rounded-lg border border-line bg-page/70 p-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-brand-soft">
                      #{speech.order} · {t(`speeches.mode.${speech.mode}`)}
                    </div>
                    <div className="font-heading text-sm font-semibold text-ink">
                      {speech.speaker.name}
                      {speech.speaker.relationship ? (
                        <span className="ml-1 font-body text-[10px] font-normal text-muted">
                          · {speech.speaker.relationship}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {speech.script.ready ? (
                      <span className="rounded border border-emerald-800 bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">
                        {t('speeches.scriptReady')}
                      </span>
                    ) : (
                      <span className="rounded border border-amber-800 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[9px] text-amber-200">
                        {t('speeches.scriptMissing')}
                      </span>
                    )}
                    {!speech.speakerVisible ? (
                      <span className="rounded border border-alert/60 bg-alert/20 px-1.5 py-0.5 font-mono text-[9px] text-alert-tint">
                        {t('speeches.speakerHidden')}
                      </span>
                    ) : null}
                  </div>
                </div>

                {missingComplexScript ? (
                  <p className="mt-1.5 rounded border border-amber-800 bg-amber-950/50 px-1.5 py-1 text-[10px] text-amber-200">
                    {t('speeches.complexMissing')}
                  </p>
                ) : null}
              </li>
            );
          })}
      </ol>

      <p className="mt-2 text-[10px] text-muted">
        {t('speeches.footer')}
      </p>
    </section>
  );
}
