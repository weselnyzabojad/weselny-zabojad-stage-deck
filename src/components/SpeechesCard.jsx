import { useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { speechPairsToScriptBlocks } from '../lib/speechScriptBlocks.js';
import BilingualScriptViewer from './BilingualScriptViewer.jsx';
import ModalShell from './ModalShell';

const MODE_CHIPS = {
  OFF: 'border-line-strong bg-raised text-muted',
  LIGHT: 'border-cyan-800 bg-cyan-950/60 text-cyan-200',
  COMPLEX: 'border-brand-strong bg-brand/30 text-brand-tint',
};

// MC-only speech list. In production the list and scripts come from the
// encrypted speech bundle; the local/demo path keeps the legacy cartridge data.
export default function SpeechesCard({ mode, speeches, speechBundle = null }) {
  const { t } = useI18n();
  const [readerSpeech, setReaderSpeech] = useState(null);
  const [reader, setReader] = useState({ status: 'idle', data: null });
  const [busySpeechId, setBusySpeechId] = useState(null);
  const [actionError, setActionError] = useState('');

  // A bundle failure is visible even when no metadata was returned.
  const bundleError = speechBundle?.status === 'error';
  if (!speeches?.length && !bundleError) return null;

  const liveSpeechId = speechBundle?.liveSpeechId ?? null;

  const openSpeech = async (speech) => {
    if (!speechBundle || !speech.script?.ready) return;
    setReaderSpeech(speech);
    setReader({ status: 'loading', data: null });
    try {
      const data = await speechBundle.openSpeech(speech);
      setReader({ status: 'ready', data });
    } catch {
      setReader({ status: 'error', data: null });
    }
  };

  const closeReader = () => {
    setReaderSpeech(null);
    setReader({ status: 'idle', data: null });
  };

  const startSpeech = async (speech) => {
    if (!speechBundle) return;
    setBusySpeechId(speech.id);
    setActionError('');
    try {
      await speechBundle.startSpeech(speech);
    } catch {
      setActionError(t('speeches.actionError'));
    } finally {
      setBusySpeechId(null);
    }
  };

  const endSpeech = async () => {
    if (!speechBundle) return;
    setBusySpeechId(liveSpeechId);
    setActionError('');
    try {
      await speechBundle.endSpeech();
    } catch {
      setActionError(t('speeches.actionError'));
    } finally {
      setBusySpeechId(null);
    }
  };

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

      {speechBundle?.status === 'error' ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-amber-800 bg-amber-950/40 px-2 py-1 text-[10px] text-amber-200">
          <span>{t('speeches.bundleUnavailable')}</span>
          {speechBundle.retry ? (
            <button
              type="button"
              onClick={() => speechBundle.retry()}
              className="rounded border border-amber-700 px-2 py-0.5 font-semibold text-amber-100"
            >
              {t('speeches.retry')}
            </button>
          ) : null}
        </div>
      ) : null}

      <ol className="mt-2 space-y-2">
        {speeches.map((speech) => {
          const missingComplexScript =
            mode === 'COMPLEX' && !speech.script?.ready;
          const live = speechBundle ? liveSpeechId === speech.id : false;
          return (
            <li
              key={speech.id}
              className={`rounded-lg border bg-page/70 p-2.5 ${
                live ? 'border-brand-strong' : 'border-line'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-brand-soft">
                    #{speech.order}
                    {speech.speakerLanguage && speech.mcLanguage
                      ? ` · ${speech.speakerLanguage} → ${speech.mcLanguage}`
                      : ''}
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
                  {live ? (
                    <span className="rounded border border-brand-strong bg-brand/40 px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink">
                      {t('speeches.liveNow')}
                    </span>
                  ) : null}
                  {speech.script?.ready ? (
                    <span className="rounded border border-emerald-800 bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">
                      {t('speeches.scriptReady')}
                    </span>
                  ) : mode === 'LIGHT' ? null : (
                    <span className="rounded border border-amber-800 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[9px] text-amber-200">
                      {t('speeches.scriptMissing')}
                    </span>
                  )}
                  {speech.speakerVisible === false ? (
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

              {speechBundle && mode === 'COMPLEX' ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => openSpeech(speech)}
                    disabled={!speech.script?.ready}
                    className="rounded border border-line-strong bg-raised px-2 py-1 font-semibold text-ink disabled:opacity-40"
                  >
                    {t('speeches.read')}
                  </button>
                  {live ? (
                    <button
                      type="button"
                      onClick={endSpeech}
                      disabled={busySpeechId === speech.id}
                      className="rounded border border-alert/60 bg-alert/20 px-2 py-1 font-semibold text-alert-soft disabled:opacity-40"
                    >
                      {t('speeches.endSpeech')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startSpeech(speech)}
                      disabled={!speech.script?.ready || busySpeechId === speech.id}
                      className="rounded border border-brand-strong bg-brand/30 px-2 py-1 font-semibold text-brand-tint disabled:opacity-40"
                    >
                      {t('speeches.startSpeech')}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {actionError ? (
        <p className="mt-2 text-[10px] text-alert-soft" role="alert">
          {actionError}
        </p>
      ) : null}

      <p className="mt-2 text-[10px] text-muted">
        {t('speeches.footer')}
      </p>

      <ModalShell
        open={Boolean(readerSpeech)}
        onClose={closeReader}
        size="full"
        labelledBy="mc-speech-reader-title"
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="border-b border-line px-5 py-4 pr-16">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {t('speeches.readerLabel')} · {readerSpeech?.speakerLanguage} →{' '}
              {readerSpeech?.mcLanguage}
            </p>
            <h2
              id="mc-speech-reader-title"
              className="mt-1 font-heading text-lg font-bold text-ink"
            >
              {readerSpeech?.speaker?.name}
              {readerSpeech?.speaker?.relationship
                ? ` · ${readerSpeech.speaker.relationship}`
                : ''}
            </h2>
          </header>

          <div className="min-h-0 flex-1 px-5 py-5">
            {reader.status === 'loading' ? (
              <p className="text-sm text-muted">{t('speeches.decrypting')}</p>
            ) : reader.status === 'error' ? (
              <p className="rounded border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
                {t('speeches.readerUnavailable')}
              </p>
            ) : (
              <BilingualScriptViewer
                scriptBlocks={speechPairsToScriptBlocks(reader.data)}
                languageA={reader.data?.speakerLanguage ?? readerSpeech?.speakerLanguage}
                languageB={reader.data?.mcLanguage ?? readerSpeech?.mcLanguage}
                initialActive="b"
              />
            )}
          </div>
        </div>
      </ModalShell>
    </section>
  );
}
