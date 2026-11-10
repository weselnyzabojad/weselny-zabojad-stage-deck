import { useI18n } from '../i18n/useI18n';
import { formatDuration, resolveEventDateISO, resolveVenueTimeZone } from '../lib/eventTime.js';
import { speechTiming } from '../lib/speeches.js';

const MODE_CHIPS = {
  OFF: 'border-line-strong bg-raised text-muted',
  LIGHT: 'border-cyan-800 bg-cyan-950/60 text-cyan-200',
  COMPLEX: 'border-brand-strong bg-brand/30 text-brand-tint',
};

const FALLBACK_NOW = new Date(0);

function countdownLabel(seconds, t) {
  if (seconds == null) return null;
  const duration = formatDuration(seconds);
  return seconds >= 0
    ? t('speeches.in', { duration })
    : t('speeches.ago', { duration });
}

// MC-only speech list. Selecting a row sets `active_speech_id`, which the
// dedicated speaker device reads to show exactly one script.
export default function SpeechesCard({ wedding, mode, speeches, activeSpeechId, onSelect, clock }) {
  const { t } = useI18n();
  // No speeches means no below-timeline card at all; the MC top-bar chip still
  // communicates the OFF/no-speech state.
  if (!speeches?.length) return null;

  const now = clock?.now instanceof Date ? clock.now : FALLBACK_NOW;
  const eventDateISO = resolveEventDateISO(wedding);
  const timeZone = resolveVenueTimeZone(wedding);

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
            const active = speech.id === activeSpeechId;
            const timing = speechTiming(speech, { now, eventDateISO, timeZone });
            const missingComplexScript = speech.mode === 'COMPLEX' && !speech.script.ready;
            return (
              <li
                key={speech.id}
                className={`rounded-lg border p-2.5 ${
                  active ? 'border-brand-strong bg-brand/20' : 'border-line bg-page/70'
                }`}
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
                    <div className="mt-0.5 flex flex-wrap gap-1.5 font-mono text-[10px] text-muted">
                      {speech.time ? (
                        <span>
                          {speech.time}
                          {timing.startsInSec != null
                            ? ` (${countdownLabel(timing.startsInSec, t)})`
                            : ''}
                        </span>
                      ) : null}
                      {speech.language ? <span>{speech.language}</span> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelect(active ? null : speech.id)}
                      className={`min-h-11 rounded border px-3 py-2 text-[10px] font-semibold transition ${
                        active
                          ? 'border-alert/60 bg-alert/20 text-alert-tint hover:bg-alert/30'
                          : 'border-brand-strong bg-brand/40 text-ink hover:bg-brand/60'
                      }`}
                    >
                      {active ? t('speeches.stopLive') : t('speeches.goLive')}
                    </button>
                    {speech.script.ready ? (
                      <span className="rounded border border-emerald-800 bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">
                        {t('speeches.scriptReady')}
                      </span>
                    ) : (
                      <span className="rounded border border-amber-800 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[9px] text-amber-200">
                        {t('speeches.scriptMissing')}
                      </span>
                    )}
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${
                        speech.consent.storeScript
                          ? 'border-line-strong bg-raised text-muted'
                          : 'border-amber-800 bg-amber-950/60 text-amber-200'
                      }`}
                    >
                      {speech.consent.storeScript ? t('speeches.consent') : t('speeches.consentPending')}
                    </span>
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
