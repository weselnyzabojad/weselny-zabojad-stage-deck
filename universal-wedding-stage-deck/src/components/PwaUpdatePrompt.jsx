import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';
import PwaUpdateNotice from './PwaUpdateNotice';
import { saveReloadState } from '../lib/reloadState';
import {
  getPwaReloadContext,
  subscribePwaReloadContext,
} from '../lib/pwaUpdateState';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export default function PwaUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);
  const updateSWRef = useRef(null);
  const registrationRef = useRef(null);
  // Issue #541: a service worker can take control without this tab asking for
  // it (another tab sends SKIP_WAITING, or the browser activates a waiting
  // worker). Only the tab whose operator pressed "Reload now" may reload.
  const reloadRequestedRef = useRef(false);
  const intervalRef = useRef(null);
  const visibilityHandlerRef = useRef(null);
  const context = useSyncExternalStore(
    subscribePwaReloadContext,
    getPwaReloadContext,
    getPwaReloadContext,
  );

  useEffect(() => {
    if (!import.meta.env.PROD || typeof window === 'undefined') return undefined;

    let disposed = false;
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (disposed) return;
        setNeedRefresh(true);
        setDismissed(false);
      },
      onNeedReload() {
        // The library calls this when a new worker takes control. Without this
        // callback it reloads unconditionally, which is the #541 white-flash
        // loop. Reload only after this tab explicitly requested it.
        if (disposed || !reloadRequestedRef.current) return;
        reloadRequestedRef.current = false;
        window.location.reload();
      },
      onOfflineReady() {
        // Offline readiness needs no interruption; the PWA is still usable.
      },
      onRegisteredSW(_swUrl, registration) {
        if (disposed) return;
        registrationRef.current = registration;

        const check = () => {
          registration?.update().catch(() => {
            // A failed background check must never interrupt the live UI.
          });
        };

        intervalRef.current = window.setInterval(check, CHECK_INTERVAL_MS);

        const onVisible = () => {
          if (document.visibilityState === 'visible') check();
        };
        visibilityHandlerRef.current = onVisible;
        document.addEventListener('visibilitychange', onVisible);
      },
      onRegisterError(error) {
        console.warn('PWA registration failed', error);
      },
    });

    updateSWRef.current = updateSW;

    return () => {
      disposed = true;
      updateSWRef.current = null;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (visibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
        visibilityHandlerRef.current = null;
      }
    };
  }, []);

  const checkForUpdates = async () => {
    setDismissed(false);
    setChecking(true);
    try {
      await registrationRef.current?.update();
    } catch {
      // Keep the current UI; a failed check is not a stage failure.
    } finally {
      setChecking(false);
    }
  };

  const reloadNow = () => {
    if (context.blockedReason) return;
    // Issue #81: capture the scroll position right before the deferred reload
    // so App can restore it once the new service worker takes control.
    saveReloadState({
      overlay: context.overlay,
      scrollY: typeof window === 'undefined' ? 0 : window.scrollY,
    });
    // Mark this tab as the one that asked for the update so the library's
    // `controlling` handler (see onNeedReload) is allowed to reload it.
    reloadRequestedRef.current = true;
    updateSWRef.current?.(true);
  };

  if (!import.meta.env.PROD) return null;

  return (
    <PwaUpdateNotice
      needRefresh={needRefresh && !dismissed}
      blockedReason={context.blockedReason}
      checking={checking}
      onReload={reloadNow}
      onLater={() => setDismissed(true)}
      onCheck={checkForUpdates}
    />
  );
}
