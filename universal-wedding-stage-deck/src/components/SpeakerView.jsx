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
          <div className="space-y-5">
            <section
              aria-label={t('speaker.nowSpeaking')}
              className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 px-1"
            >
              <h1 className="break-words font-heading text-xl font-bold text-ink">
                {activeSpeech.speaker.name}
              </h1>
              {activeSpeech.speaker.relationship ? (
                <span className="break-words text-base text-muted">
                  {activeSpeech.speaker.relationship}
                </span>
              ) : null}
            </section>

            {activeSpeech.script.text ? (
              <section className="max-w-prose">
                <div className="whitespace-pre-wrap break-words font-body text-xl leading-relaxed text-ink sm:text-2xl sm:leading-relaxed lg:text-3xl lg:leading-relaxed">
                  {activeSpeech.script.text}
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-center">
                <p className="font-heading text-sm font-semibold text-amber-200">
                  {t('speaker.scriptMissingTitle')}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {t('speaker.scriptMissingBody')}
                </p>
              </section>
            )}
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
    <div className="flex min-h-dvh flex-col bg-page text-ink antialiased">
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
