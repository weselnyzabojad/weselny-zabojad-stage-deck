import React, { useEffect, useState } from 'react';
import AppErrorBoundary from './components/AppErrorBoundary';
import PairingScreen from './components/PairingScreen';
import RoleJoinScreen from './components/RoleJoinScreen';
import StageDeck from './StageDeck';
import { DEFAULT_WEDDING } from './demo/demoWedding';
import { getSyncConfig } from './lib/sync/syncConfig';
import {
  clearRoleSession,
  isRoleSessionValid,
  loadRoleSession,
  parseDeckIntent,
  saveRoleSession,
} from './lib/sync/roleSession';
import { usePublishedCartridge } from './hooks/usePublishedCartridge';
import { useI18n } from './i18n/useI18n';
import { usePairing } from './hooks/usePairing';
import { useRole } from './hooks/useRole';
import { useTheme } from './hooks/useTheme';

// Production `/deck/` uses per-role PINs validated by the join_room Edge
// Function. Local/demo mode keeps the DDMM display-PIN gate and the demo
// cartridge, but still has no cartridge import/reset path.
const SYNC_CONFIG = getSyncConfig();
const IS_PRODUCTION = SYNC_CONFIG.isProduction;
const DECK_INTENT =
  typeof window !== 'undefined'
    ? parseDeckIntent(window.location.pathname, window.location.search, import.meta.env.BASE_URL)
    : { roomCode: null, role: null, requirePin: false };

export default function App() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [roleSession, setRoleSession] = useState(() =>
    IS_PRODUCTION ? loadRoleSession() : null,
  );
  const [phoneAuthDone, setPhoneAuthDone] = useState(false);
  const requireQrPin = DECK_INTENT.requirePin === true && !phoneAuthDone;
  const sessionValid =
    IS_PRODUCTION && isRoleSessionValid(roleSession) && !requireQrPin;
  const pairing = usePairing({
    expectedPin: DEFAULT_WEDDING.syncPin,
    weddingId: DEFAULT_WEDDING.weddingId,
  });
  const { role, setRole } = useRole();
  const publishedCartridge = usePublishedCartridge({
    enabled: IS_PRODUCTION && sessionValid,
    weddingId: roleSession?.weddingId ?? null,
    accessToken: roleSession?.token ?? null,
    syncConfig: SYNC_CONFIG,
  });

  // Local pocket deep links use `?role=...`; apply the intent once on mount so
  // an Open on phone QR can select the same role on a fresh device.
  useEffect(() => {
    if (!IS_PRODUCTION && DECK_INTENT.role) setRole(DECK_INTENT.role);
  }, [setRole]);

  // Production must never fall back to the built-in demo. The cartridge hook
  // only exposes the cache for this joined wedding and replaces it in place
  // when a newer server revision arrives.
  const activeCartridgeStateBase = IS_PRODUCTION
    ? {
        status: publishedCartridge.cartridge
          ? 'ready'
          : publishedCartridge.freshness === 'error'
            ? 'error'
            : 'loading',
        wedding: publishedCartridge.cartridge,
        stale: publishedCartridge.stale,
        error: publishedCartridge.error,
      }
    : { status: 'ready', wedding: DEFAULT_WEDDING, stale: false, error: null };

  // Never render a cartridge that belongs to a different joined wedding.
  const wrongWedding =
    IS_PRODUCTION &&
    activeCartridgeStateBase.wedding &&
    activeCartridgeStateBase.wedding.weddingId !== roleSession?.weddingId;
  const activeCartridgeState = wrongWedding
    ? { ...activeCartridgeStateBase, wedding: null, status: 'loading' }
    : activeCartridgeStateBase;

  if (IS_PRODUCTION && !sessionValid) {
    return (
      <AppErrorBoundary
        scope="join"
        weddingId={roleSession?.weddingId ?? null}
        lastKnownStep={null}
      >
        <RoleJoinScreen
          intent={DECK_INTENT}
          theme={theme}
          onToggleTheme={toggleTheme}
          onJoined={(session) => {
            saveRoleSession(session);
            setRoleSession(session);
            setPhoneAuthDone(true);
          }}
        />
      </AppErrorBoundary>
    );
  }

  if (IS_PRODUCTION && !activeCartridgeState.wedding) {
    const failed = activeCartridgeState.status === 'error';
    return (
      <AppErrorBoundary
        scope="cartridge"
        weddingId={roleSession?.weddingId ?? null}
        lastKnownStep={null}
      >
        <div className="flex min-h-screen items-center justify-center bg-page px-4 text-center text-ink">
          <div className="max-w-sm rounded-2xl border border-line bg-card p-6 shadow-2xl">
            <div className="text-3xl" aria-hidden="true">
              {failed ? '⚠️' : '🎧'}
            </div>
            <h1 className="mt-2 font-heading text-lg font-bold text-ink">
              {failed ? t('app.errorWedding') : t('app.loadingWedding')}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {failed
                ? activeCartridgeState.error ?? t('app.errorWedding')
                : t('app.loadingWeddingBody')}
            </p>
            {failed ? (
              <button
                type="button"
                onClick={() => publishedCartridge.retry()}
                className="mt-4 rounded-lg border border-brand-strong bg-brand px-4 py-2 text-xs font-bold text-on-accent transition hover:bg-brand-hover"
              >
                {t('app.retry')}
              </button>
            ) : null}
          </div>
        </div>
      </AppErrorBoundary>
    );
  }

  if (!IS_PRODUCTION && (!pairing.isPaired || requireQrPin)) {
    return (
      <AppErrorBoundary
        scope="pairing"
        weddingId={DEFAULT_WEDDING.weddingId}
        lastKnownStep={null}
      >
        <PairingScreen
          wedding={DEFAULT_WEDDING}
          onPair={(pin) => {
            const result = pairing.pair(pin);
            if (result?.ok) setPhoneAuthDone(true);
            return result;
          }}
          cloudConfigured={SYNC_CONFIG.enabled}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </AppErrorBoundary>
    );
  }

  const wedding = IS_PRODUCTION ? activeCartridgeState.wedding : DEFAULT_WEDDING;

  return (
    <StageDeck
      wedding={wedding}
      roleSession={roleSession}
      sessionValid={sessionValid}
      pairing={pairing}
      role={role}
      setRole={setRole}
      theme={theme}
      toggleTheme={toggleTheme}
      cartridgeStale={IS_PRODUCTION ? activeCartridgeState.stale : false}
      cartridgeRevision={IS_PRODUCTION ? publishedCartridge.revision : null}
      cartridgeFreshness={IS_PRODUCTION ? publishedCartridge.freshness : 'current'}
      cartridgeChecking={IS_PRODUCTION ? publishedCartridge.checking : false}
      cartridgeNotice={IS_PRODUCTION ? publishedCartridge.notice : null}
      isProduction={IS_PRODUCTION}
      deckIntent={DECK_INTENT}
      onSignOut={() => {
        clearRoleSession();
        setRoleSession(null);
      }}
    />
  );
}
