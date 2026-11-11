import { useEffect, useState } from 'react';
import RoleShell from './RoleShell';
import SecondaryControlBar from './SecondaryControlBar';
import SyncStatusBadge from './SyncStatusBadge';
import TopBarCenterIdentity from './TopBarCenterIdentity';
import TopBarClock from './TopBarClock';
import TopBarRoleIdentity from './TopBarRoleIdentity';
import TopBarLogo from './TopBarLogo';
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
import { fetchSpeechKey } from '../lib/speechKeyApi.js';
import { loadSpeechKey, saveSpeechKey, speechKeyId } from '../lib/speechKeyStore.js';
import { decryptSpeechRedaction, importSpeechKey, splitSecretTokens } from '../lib/speechSecrets.js';

function SecretScript({ text, redactions, weddingId, speechId, accessToken }) {
  const { t } = useI18n();
  const [key, setKey] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cacheId = speechKeyId({ weddingId, speechId });

  useEffect(() => {
    let active = true;
    loadSpeechKey(cacheId).then((cached) => {
      if (active && cached) setKey(cached);
    });
    return () => {
      active = false;
    };
  }, [cacheId]);

  const secrets = Array.isArray(redactions) ? redactions : [];
  if (secrets.length === 0) {
    return (
      <div className="whitespace-pre-wrap break-words font-body text-xl leading-relaxed text-ink sm:text-2xl sm:leading-relaxed lg:text-3xl lg:leading-relaxed">
        {text}
      </div>
    );
  }

  const unlock = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await fetchSpeechKey({ accessToken, speechId });
      const imported = await importSpeechKey(result.key);
      await saveSpeechKey(cacheId, imported);
      setKey(imported);
    } catch (err) {
      setError(err.message ?? t('speaker.unlockError'));
    } finally {
      setBusy(false);
    }
  };

  const reveal = async (redactionId) => {
    const redaction = secrets.find((entry) => entry.id === redactionId);
    if (!key || !redaction) return;
    setBusy(true);
    setError('');
    try {
      const plaintext = await decryptSpeechRedaction(key, {
        weddingId,
        speechId,
        redaction,
      });
      setRevealed((current) => ({ ...current, [redactionId]: plaintext ?? '' }));
    } catch {
      setError(t('speaker.unlockError'));
    } finally {
      setBusy(false);
    }
  };

  const parts = splitSecretTokens(text);
  return (
    <div>
      <div className="whitespace-pre-wrap break-words font-body text-xl leading-relaxed text-ink sm:text-2xl sm:leading-relaxed lg:text-3xl lg:leading-relaxed">
        {parts.map((part, index) =>
          part.type === 'text' ? (
            <span key={`text-${index}`}>{part.value}</span>
          ) : revealed[part.id] != null ? (
            <span key={`secret-${part.id}`}>{revealed[part.id]}</span>
          ) : (
            <button
              key={`secret-${part.id}`}
              type="button"
              onClick={() => (key ? reveal(part.id) : unlock())}
              disabled={busy}
              className="mx-0.5 inline-flex items-center rounded-full border border-line-strong bg-raised px-2 py-0.5 align-baseline font-mono text-sm text-muted transition hover:text-ink disabled:opacity-40"
              aria-label={t('speaker.revealSecret')}
              title={t('speaker.revealSecret')}
            >
              •••••
            </button>
          ),
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {!key ? (
          <button
            type="button"
            onClick={unlock}
            disabled={busy}
            className="rounded border border-line-strong bg-raised px-3 py-1 font-semibold text-ink disabled:opacity-40"
          >
            {t('speaker.unlockScript')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed({})}
            disabled={busy}
            className="rounded border border-line-strong bg-raised px-3 py-1 font-semibold text-ink disabled:opacity-40"
          >
            {t('speaker.hideSecret')}
          </button>
        )}
        {error ? <span className="text-alert-soft">{error}</span> : null}
      </div>
    </div>
  );
}

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
  accessToken = null,
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
                <SecretScript
                  text={activeSpeech.script.text}
                  redactions={activeSpeech.script.redactions}
                  weddingId={wedding?.weddingId}
                  speechId={activeSpeech.id}
                  accessToken={accessToken}
                />
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
        showChildrenExpected={false}
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
            <TopBarLogo />
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
