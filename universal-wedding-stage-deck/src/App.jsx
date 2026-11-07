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
import {
  isCartridgeLike,
  loadCachedCartridge,
  saveCachedCartridge,
} from './lib/cartridgeStorage';
import { createSupabaseSyncClient } from './lib/sync/supabaseSyncClient';
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
    : { roomCode: null, role: null };

function idleCartridgeState() {
  return { status: 'idle', wedding: null, stale: false, error: null };
}

export default function App() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [roleSession, setRoleSession] = useState(() =>
    IS_PRODUCTION ? loadRoleSession() : null,
  );
  const sessionValid = IS_PRODUCTION && isRoleSessionValid(roleSession);
  const pairing = usePairing({
    expectedPin: DEFAULT_WEDDING.syncPin,
    weddingId: DEFAULT_WEDDING.weddingId,
  });
  const { role, setRole } = useRole();
  const [reloadKey, setReloadKey] = useState(0);
  // Production must never fall back to the built-in demo. The cache is only a
  // read-only copy of a server-published cartridge for the same wedding.
  const [cartridgeState, setCartridgeState] = useState(() => {
    if (!IS_PRODUCTION) {
      return { status: 'ready', wedding: DEFAULT_WEDDING, stale: false, error: null };
    }
    if (!sessionValid) return idleCartridgeState();
    const cached = loadCachedCartridge(roleSession.weddingId);
    return cached
      ? { status: 'loading', wedding: cached.cartridge, stale: true, error: null }
      : { status: 'loading', wedding: null, stale: false, error: null };
  });

  // Local pocket deep links use `?role=...`; apply the intent once on mount so
  // an Open on phone QR can select the same role on a fresh device.
  useEffect(() => {
    if (!IS_PRODUCTION && DECK_INTENT.role) setRole(DECK_INTENT.role);
  }, [setRole]);

  // Fetch the server-published cartridge after the role PIN is accepted. A
  // cached copy for the same wedding keeps the deck usable offline; it is
  // marked stale until the authoritative fetch succeeds. There is deliberately
  // no local import, activation or demo fallback in production.
  useEffect(() => {
    if (!IS_PRODUCTION) return undefined;
    if (!sessionValid || !roleSession) {
      setCartridgeState(idleCartridgeState());
      return undefined;
    }

    let cancelled = false;
    const cached = loadCachedCartridge(roleSession.weddingId);
    setCartridgeState((current) => {
      const sameWedding = current.wedding?.weddingId === roleSession.weddingId;
      return {
        status: 'loading',
        wedding: cached?.cartridge ?? (sameWedding ? current.wedding : null),
        stale: Boolean(cached) || (sameWedding && current.stale),
        error: null,
      };
    });

    const client = createSupabaseSyncClient(SYNC_CONFIG, {
      accessToken: roleSession.token,
    });

    client
      .fetchWedding(roleSession.weddingId)
      .then((row) => {
        if (cancelled) return;
        if (!row?.cartridge) throw new Error(t('app.noPublishedCartridge'));
        if (!isCartridgeLike(row.cartridge)) {
          throw new Error(t('app.invalidPublishedCartridge'));
        }
        // `cartridge_revision` is the server publication marker (#165). The
        // cache keeps the revision so a later read can tell which snapshot it
        // holds; the deck always renders the latest fetched revision.
        saveCachedCartridge({
          weddingId: roleSession.weddingId,
          cartridge: row.cartridge,
          revision: row.cartridge_revision ?? null,
          fetchedAt: new Date().toISOString(),
        });
        setCartridgeState({
          status: 'ready',
          wedding: row.cartridge,
          stale: false,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setCartridgeState((current) => {
          if (current.wedding?.weddingId === roleSession.weddingId) {
            return {
              status: 'ready',
              wedding: current.wedding,
              stale: true,
              error: error.message,
            };
          }
          return { status: 'error', wedding: null, stale: false, error: error.message };
        });
      });

    return () => {
      cancelled = true;
    };
  }, [roleSession, sessionValid, reloadKey, t]);

  // Never render a cartridge that belongs to a different joined wedding. Keep
  // the error/loading state for this session intact so a missing server
  // cartridge surfaces the retry screen instead of an endless loader.
  const activeCartridgeState =
    IS_PRODUCTION && cartridgeState.wedding
      ? cartridgeState.wedding.weddingId === roleSession?.weddingId
        ? cartridgeState
        : { status: 'loading', wedding: null, stale: false, error: null }
      : cartridgeState;

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
        <div className="flex min-h-screen items-center justify-center bg-page px-4 text-center text-slate-100">
          <div className="max-w-sm rounded-2xl border border-line bg-card p-6 shadow-2xl">
            <div className="text-3xl" aria-hidden="true">
              {failed ? '⚠️' : '🎧'}
            </div>
            <h1 className="mt-2 font-heading text-lg font-bold text-white">
              {failed ? t('app.errorWedding') : t('app.loadingWedding')}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {failed
                ? activeCartridgeState.error ?? t('app.errorWedding')
                : t('app.loadingWeddingBody')}
            </p>
            {failed ? (
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-4 rounded-lg border border-brand-strong bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover"
              >
                {t('app.retry')}
              </button>
            ) : null}
          </div>
        </div>
      </AppErrorBoundary>
    );
  }

  if (!IS_PRODUCTION && !pairing.isPaired) {
    return (
      <AppErrorBoundary
        scope="pairing"
        weddingId={DEFAULT_WEDDING.weddingId}
        lastKnownStep={null}
      >
        <PairingScreen
          wedding={DEFAULT_WEDDING}
          onPair={pairing.pair}
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
      isProduction={IS_PRODUCTION}
      deckIntent={DECK_INTENT}
      onSignOut={() => {
        clearRoleSession();
        setRoleSession(null);
        setCartridgeState(idleCartridgeState());
      }}
    />
  );
}
