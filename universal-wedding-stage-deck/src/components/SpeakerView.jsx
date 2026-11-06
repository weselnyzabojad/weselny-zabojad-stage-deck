import { useEffect, useState } from 'react';
import logo from '../assets/img/logo.png';
import RoleShell from './RoleShell';
import SyncStatusBadge from './SyncStatusBadge';
import TopBarClock from './TopBarClock';
import TopBarRoleLabel from './TopBarRoleLabel';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import OpenOnPhoneButton from './OpenOnPhoneButton';
import SkipLink from './SkipLink';
import { useI18n } from '../i18n/useI18n';
import {
  formatDuration,
  resolveEventDateISO,
  resolveVenueTimeZone,
} from '../lib/eventTime.js';
import {
  clearSpeakerScript,
  saveSpeakerScript,
} from '../lib/speakerCache.js';
import { speechTiming } from '../lib/speeches.js';

function TimerChip({ value, tone }) {
  return (
    <span
      className={`rounded border px-2 py-1 font-mono text-xs font-semibold ${tone}`}
    >
      {value}
    </span>
  );
}

const FALLBACK_NOW = new Date(0);

// Read-only speaker teleprompter. It uses large text and shows only the speech
// the MC has made live, never the timeline
// controls, VIP alerts or other speeches.
export default function SpeakerView({
  wedding,
  clock,
  speechMode = 'OFF',
  speechCount = 0,
  activeSpeech,
  activeSpeechId = null,
  fromCache = false,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox = null,
  theme = 'night',
  onToggleTheme,
  roomCode = null,
}) {
  const { t } = useI18n();
  const now = clock?.now instanceof Date ? clock.now : FALLBACK_NOW;
  const eventDateISO = resolveEventDateISO(wedding);
  const timeZone = resolveVenueTimeZone(wedding);
  const timing = activeSpeech
    ? speechTiming(activeSpeech, { now, eventDateISO, timeZone })
    : null;

  // Offline-first: keep only the assigned script on this device. Clear it when
  // the MC explicitly ends the speech; never cache a non-consented script.
  // The snapshot keeps the effect keyed to meaningful changes.
  const speechSnapshot = activeSpeech ? JSON.stringify(activeSpeech) : '';
  useEffect(() => {
    if (fromCache) return;
    if (speechSnapshot) {
      try {
        saveSpeakerScript(wedding.weddingId, JSON.parse(speechSnapshot));
      } catch {
        // Ignore a malformed snapshot; the view still renders from props.
      }
    } else if (!activeSpeechId) {
      clearSpeakerScript(wedding.weddingId);
    }
  }, [speechSnapshot, activeSpeechId, fromCache, wedding.weddingId]);

  const started = timing?.startsInSec != null && timing.startsInSec <= 0;
  const overrun = timing?.remainingSec != null && timing.remainingSec < 0;

  const [isCompact, setIsCompact] = useState(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(max-width: 639px)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsCompact(mq.matches);
    const listener = () => setIsCompact(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  const speakerBody = (
    <>
        {speechMode === 'OFF' ? (
          <section className="rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              🔇
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">{t('speaker.offTitle')}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {t('speaker.offBody')}
            </p>
          </section>
        ) : speechCount === 0 ? (
          <section className="rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              📝
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">{t('speaker.noneTitle')}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {t('speaker.noneBody')}
            </p>
          </section>
        ) : !activeSpeech ? (
          <section className="rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              ⏳
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">
              {t('speaker.waitTitle')}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {t('speaker.waitBody')}
            </p>
          </section>
        ) : !activeSpeech.speakerVisible ? (
          <section className="rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              🔒
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">
              {t('speaker.notSharedTitle')}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {t('speaker.notSharedBody')}
            </p>
          </section>
        ) : !activeSpeech.scriptAllowed ? (
          <section className="rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              🔒
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">
              {t('speaker.notStoredTitle')}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {t('speaker.notStoredBody')}
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="rounded-2xl border border-brand-strong/50 bg-card p-4 shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-brand-soft">
                      Now speaking
                    </div>
                    {fromCache ? (
                      <span className="rounded border border-amber-700 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[9px] text-amber-200">
                        Offline copy
                      </span>
                    ) : null}
                  </div>
                  <h1 className="mt-0.5 font-heading text-2xl font-bold text-ink">
                    {activeSpeech.speaker.name}
                  </h1>
                  {activeSpeech.speaker.relationship ? (
                    <div className="text-xs text-slate-400">{activeSpeech.speaker.relationship}</div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {!started ? (
                    <TimerChip
                      value={`Starts in ${formatDuration(timing?.startsInSec ?? 0)}`}
                      tone="border-cyan-800 bg-cyan-950/60 text-cyan-200"
                    />
                  ) : overrun ? (
                    <TimerChip
                      value={`Over ${formatDuration(timing.remainingSec)}`}
                      tone="border-alert/60 bg-alert/20 text-alert-tint"
                    />
                  ) : timing?.remainingSec != null ? (
                    <TimerChip
                      value={`${formatDuration(timing.remainingSec)} left`}
                      tone="border-emerald-800 bg-emerald-950/60 text-emerald-300"
                    />
                  ) : activeSpeech.durationMin != null ? (
                    <TimerChip
                      value={`${activeSpeech.durationMin} min`}
                      tone="border-line-strong bg-raised text-slate-300"
                    />
                  ) : null}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                {activeSpeech.time ? (
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-slate-300">
                    🕒 {activeSpeech.time}
                  </span>
                ) : null}
                {activeSpeech.cue ? (
                  <span className="rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 text-brand-tint">
                    Cue: {activeSpeech.cue}
                  </span>
                ) : null}
                {activeSpeech.mic ? (
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-300">
                    🎙 {activeSpeech.mic}
                  </span>
                ) : null}
                {activeSpeech.language ? (
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-300">
                    {activeSpeech.language}
                  </span>
                ) : null}
                {activeSpeech.delivery ? (
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-300">
                    {activeSpeech.delivery}
                  </span>
                ) : null}
                {activeSpeech.readFrom ? (
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-300">
                    Reads from {activeSpeech.readFrom.toLowerCase()}
                  </span>
                ) : null}
                {activeSpeech.consent ? (
                  <span
                    className={`rounded border px-1.5 py-0.5 ${
                      activeSpeech.consent.storeScript
                        ? 'border-emerald-800 bg-emerald-950/60 text-emerald-300'
                        : 'border-alert/60 bg-alert/20 text-alert-tint'
                    }`}
                  >
                    {activeSpeech.consent.storeScript ? 'Script consent confirmed' : 'Consent pending'}
                  </span>
                ) : null}
                {activeSpeech.mcIntro ? (
                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-slate-300">
                    MC introduces
                  </span>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-card p-4 shadow-lg sm:p-6">
              {activeSpeech.script.text ? (
                <div className="whitespace-pre-wrap font-body text-lg leading-relaxed text-ink sm:text-xl sm:leading-relaxed">
                  {activeSpeech.script.text}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-center">
                  <p className="font-heading text-sm font-semibold text-amber-200">
                    Script not provided yet
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Check with the MC; the text can still be added to the cartridge.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
    </>
  );

  if (isCompact) {
    return (
      <RoleShell
        compact
        role="speaker"
        roles={[]}
        syncStatus={syncStatus}
        syncError={syncError}
        remoteUpdatedAt={remoteUpdatedAt}
        outbox={outbox}
        onToggleTheme={onToggleTheme}
        theme={theme}
      >
        <div id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl">
          <SkipLink />
          {speakerBody}
        </div>
      </RoleShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-page text-slate-100 antialiased select-none">
      <SkipLink />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-md">
            <img src={logo} alt="Weselny Żabojad" className="h-10 w-auto object-contain" />
          </div>
          <TopBarClock clock={clock} />
          <TopBarRoleLabel role="speaker" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
          <OpenOnPhoneButton role="speaker" roomCode={roomCode} />
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-5">
        {speakerBody}
      </main>

      <footer className="border-t border-line bg-card px-4 py-2 text-center font-mono text-[10px] text-slate-500">
        Read-only script · only the assigned speech is shown · no timeline controls
      </footer>
    </div>
  );
}
