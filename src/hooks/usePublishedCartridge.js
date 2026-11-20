// Reactive server-published cartridge provider (issue #167).
//
// The hook owns the authoritative cartridge for the joined wedding:
// - it seeds from the read-only cache, then always fetches the server row;
// - it subscribes to `public.weddings` changes as hints and fetches again;
// - it catches up after Realtime reconnect, browser online and visibility/focus;
// - it only applies a complete, validated, strictly newer revision;
// - it clears the previous wedding's cache when the session changes.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearCachedCartridge,
  loadCachedCartridge,
  saveCachedCartridge,
} from '../lib/cartridgeStorage';
import { applyPublishedRow } from '../lib/cartridgeSync';
import { createSupabaseSyncClient } from '../lib/sync/supabaseSyncClient';
import { useI18n } from '../i18n/useI18n';

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

function idleState() {
  return {
    weddingId: null,
    cartridge: null,
    revision: null,
    publication: null,
    freshness: 'idle',
    checking: false,
    error: null,
    notice: null,
  };
}

export function usePublishedCartridge({ enabled, weddingId, accessToken, syncConfig }) {
  const { t } = useI18n();
  const [state, setState] = useState(idleState);
  const [retryToken, setRetryToken] = useState(0);
  const previousWeddingRef = useRef(null);

  // A different wedding (or a sign-out) must never keep the previous wedding's
  // offline snapshot around.
  useEffect(() => {
    const previous = previousWeddingRef.current;
    if (previous && previous !== weddingId) clearCachedCartridge(previous);
    previousWeddingRef.current = weddingId ?? null;
  }, [weddingId]);

  useEffect(() => {
    if (!enabled || !weddingId || !accessToken) {
      return undefined;
    }

    let cancelled = false;
    const cached = loadCachedCartridge(weddingId);
    let currentSnapshot = cached
      ? { cartridge: cached.cartridge, revision: cached.revision }
      : null;

    // eslint-disable-next-line react/set-state-in-effect -- seeds the view from the external offline cache before the server fetch
    setState({
      weddingId,
      cartridge: cached?.cartridge ?? null,
      revision: cached?.revision ?? null,
      publication: null,
      freshness: cached ? (isOnline() ? 'stale' : 'offline') : isOnline() ? 'loading' : 'offline',
      checking: false,
      error: null,
      notice: null,
    });

    const client = createSupabaseSyncClient(syncConfig, { accessToken });

    const applyRow = (row) => {
      const result = applyPublishedRow({ current: currentSnapshot, row, weddingId });
      if (result.error === 'missing') throw new Error(t('app.noPublishedCartridge'));
      if (result.error) throw new Error(t('app.invalidPublishedCartridge'));
      if (result.ignored) return false;

      if (result.unchangedRevision) {
        setState((current) => ({
          ...current,
          freshness: 'current',
          checking: false,
          error: null,
        }));
        return false;
      }

      currentSnapshot = {
        cartridge: result.snapshot.cartridge,
        revision: result.snapshot.revision,
      };
      saveCachedCartridge({
        weddingId,
        cartridge: result.snapshot.cartridge,
        revision: result.snapshot.revision,
        fetchedAt: new Date().toISOString(),
      });
      setState({
        ...result.snapshot,
        checking: false,
        error: null,
        notice: result.isUpdate
          ? { kind: 'updated', revision: result.snapshot.revision }
          : null,
      });
      return true;
    };

    let catchingUp = false;
    let pendingRefresh = false;

    const catchUp = () => {
      if (catchingUp) {
        pendingRefresh = true;
        return Promise.resolve();
      }
      catchingUp = true;
      setState((current) =>
        current.weddingId === weddingId
          ? {
              ...current,
              freshness: current.cartridge
                ? current.freshness === 'offline'
                  ? isOnline()
                    ? 'stale'
                    : 'offline'
                  : current.freshness
                : isOnline()
                  ? 'loading'
                  : 'offline',
              checking: true,
              error: null,
            }
          : current,
      );

      return client
        .fetchWedding(weddingId)
        .then((row) => {
          if (cancelled) return;
          applyRow(row);
        })
        .catch((error) => {
          if (cancelled) return;
          setState((current) =>
            current.weddingId === weddingId
              ? {
                  ...current,
                  checking: false,
                  freshness: current.cartridge
                    ? isOnline()
                      ? 'stale'
                      : 'offline'
                    : 'error',
                  error: error.message,
                  notice:
                    current.cartridge && current.revision != null
                      ? { kind: 'stale', revision: current.revision }
                      : null,
                }
              : current,
          );
        })
        .finally(() => {
          catchingUp = false;
          if (pendingRefresh && !cancelled) {
            pendingRefresh = false;
            void catchUp();
          }
        });
    };

    const unsubscribe = client.subscribeWedding(weddingId, {
      onHint: () => {
        void catchUp();
      },
      onStatus: (status) => {
        if (status === 'connected') void catchUp();
      },
    });

    // Always fetch after subscribing, even if no realtime event arrives.
    void catchUp();

    const handleOnline = () => {
      if (cancelled) return;
      void catchUp();
    };
    const handleOffline = () => {
      if (cancelled) return;
      setState((current) =>
        current.weddingId === weddingId
          ? { ...current, freshness: 'offline', checking: false }
          : current,
      );
    };
    const handleVisible = () => {
      if (!cancelled && document.visibilityState === 'visible') void catchUp();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleOnline);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleOnline);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [enabled, weddingId, accessToken, syncConfig, retryToken, t]);

  const retry = useCallback(() => setRetryToken((token) => token + 1), []);
  const stale =
    state.freshness === 'stale' ||
    state.freshness === 'offline' ||
    (!state.cartridge && state.freshness === 'error');

  // When the session is inactive the published cartridge is not exposed at all,
  // so a stale internal snapshot cannot leak into a signed-out/disabled view.
  if (!enabled || !weddingId || !accessToken) {
    return { ...idleState(), stale: false, retry };
  }
  return { ...state, stale, retry };
}
