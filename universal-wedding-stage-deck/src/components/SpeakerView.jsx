import { useEffect } from 'react';
import logo from '../assets/img/logo.png';
import RoleShell from './RoleShell';
import SecondaryControlBar from './SecondaryControlBar';
import SyncStatusBadge from './SyncStatusBadge';
import TopBarCenterIdentity from './TopBarCenterIdentity';
import TopBarClock from './TopBarClock';
import TopBarRoleIdentity from './TopBarRoleIdentity';
import TopBarShell from './TopBarShell';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import OpenOnPhoneButton from './OpenOnPhoneButton';
import SkipLink from './SkipLink';
import { useI18n } from '../i18n/useI18n';
import useCompact from '../hooks/useCompact';
import {
  clearSpeakerScript,
  saveSpeakerScript,
} from '../lib/speakerCache.js';

// Read-only speaker teleprompter. It uses large text and shows only the speech
// the MC has made live, never the timeline controls or other speeches.
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
  pin = null,
  roomCode = null,
}) {
  const { t } = useI18n();

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

  const isCompact = useCompact();

  const speakerBody = (
    <>
        {speechMode === 'OFF' ? (
          <section className="rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              🔇
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">{t('speaker.offTitle')}</h1>
            <p className="mt-1 text-sm text-muted">
              {t('speaker.offBody')}
            </p>
          </section>
        ) : speechCount === 0 ? (
          <section className="rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              📝
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">{t('speaker.noneTitle')}</h1>
            <p className="mt-1 text-sm text-muted">
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
            <p className="mt-1 text-sm text-muted">
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
            <p className="mt-1 text-sm text-muted">
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
            <p className="mt-1 text-sm text-muted">
              {t('speaker.notStoredBody')}
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="rounded-2xl border border-brand-strong/50 bg-card p-4 shadow-lg">
              <div className="font-mono text-[10px] uppercase tracking-widest text-brand-soft">
                {t('speaker.nowSpeaking')}
              </div>
              <h1 className="mt-0.5 font-heading text-2xl font-bold text-ink">
                {activeSpeech.speaker.name}
              </h1>
              {activeSpeech.speaker.relationship ? (
                <div className="text-xs text-muted">{activeSpeech.speaker.relationship}</div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-line bg-card p-4 shadow-lg sm:p-6">
              {activeSpeech.script.text ? (
                <div className="whitespace-pre-wrap font-body text-lg leading-relaxed text-ink sm:text-xl sm:leading-relaxed">
                  {activeSpeech.script.text}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-center">
                  <p className="font-heading text-sm font-semibold text-amber-200">
                    {t('speaker.scriptMissingTitle')}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t('speaker.scriptMissingBody')}
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
        clock={clock}
        pin={pin}
        wedding={wedding}
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
    <div className="flex min-h-screen flex-col bg-page text-ink antialiased select-none">
      <SkipLink />
      <TopBarShell
        left={(
          <>
            <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-md">
              <img src={logo} alt="Weselny Żabojad" className="h-12 w-auto object-contain" />
            </div>
            <TopBarClock clock={clock} />
            <TopBarRoleIdentity role="speaker" />
          </>
        )}
        center={<TopBarCenterIdentity wedding={wedding} />}
        right={null}
      />

      <SecondaryControlBar
        left={<SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />}
        right={(
          <>
            <OpenOnPhoneButton role="speaker" roomCode={roomCode} />
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
          </>
        )}
      />

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-5">
        {speakerBody}
      </main>

      <footer className="border-t border-line bg-card px-4 py-2 text-center font-mono text-[10px] text-muted">
        {t('speaker.footer')}
      </footer>
    </div>
  );
}
