import { useEffect, useState } from 'react';
import {
  buildSensitivePayload,
  createHostKey,
  decryptSensitiveNotes,
  encryptSensitiveNotes,
  hasSensitiveData,
  loadStoredHostKey,
  saveStoredHostKey,
  sensitivePayloadsEqual,
} from '../lib/sensitiveNotes';
import { createSupabaseSyncClient } from '../lib/sync/supabaseSyncClient';
import { getSyncConfig } from '../lib/sync/syncConfig';

const DISABLED = { status: 'disabled', payload: null, hostKey: null, error: null };

// D4: load the encrypted sensitive bundle for the host/MC device and decrypt it
// with the locally held host key. Non-MC roles never fetch the ciphertext.
export function useSensitiveNotes({ enabled, wedding, weddingId, accessToken }) {
  const [state, setState] = useState(DISABLED);

  useEffect(() => {
    if (!enabled || !weddingId) return undefined;

    let cancelled = false;

    const run = async () => {
      // Keep the first state update asynchronous (effect purity).
      await Promise.resolve();
      if (cancelled) return;
      setState((prev) => ({ ...prev, status: 'loading' }));

      const config = getSyncConfig();
      if (!config.enabled) {
        if (!cancelled) setState(DISABLED);
        return;
      }

      const client = createSupabaseSyncClient(config, { accessToken });
      const localPayload = buildSensitivePayload(wedding);
      const localHasData = hasSensitiveData(localPayload);
      const row = await client.fetchSensitiveNotes(weddingId);
      let key = loadStoredHostKey();

      if (row?.bundle) {
        if (!key) {
          if (!cancelled) {
            setState({
              status: 'locked',
              payload: null,
              hostKey: null,
              error: 'Host key required on this device.',
            });
          }
          return;
        }

        const remote = await decryptSensitiveNotes(row.bundle, key);

        // The MC device's local cartridge is authoritative when it still holds
        // sensitive fields; refresh the cloud bundle with the same key.
        if (localHasData && !sensitivePayloadsEqual(localPayload, remote)) {
          const bundle = await encryptSensitiveNotes(localPayload, key);
          await client.publishSensitiveNotes(weddingId, bundle);
          if (!cancelled) {
            setState({ status: 'synced', payload: localPayload, hostKey: key, error: null });
          }
          return;
        }

        if (!cancelled) {
          setState({ status: 'synced', payload: remote, hostKey: key, error: null });
        }
        return;
      }

      // No cloud bundle yet: create the host key (once) and publish the
      // encrypted local payload. The plaintext never leaves this device.
      if (!key) {
        key = createHostKey();
        saveStoredHostKey(key);
      }
      const payload = localHasData ? localPayload : { vipAlerts: [], contacts: [] };
      const bundle = await encryptSensitiveNotes(payload, key);
      await client.publishSensitiveNotes(weddingId, bundle);
      if (!cancelled) {
        setState({ status: 'synced', payload, hostKey: key, error: null });
      }
    };

    run().catch((error) => {
      if (!cancelled) {
        setState({
          status: 'error',
          payload: null,
          hostKey: null,
          error: error.message ?? 'Could not load sensitive notes.',
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, wedding, weddingId, accessToken]);

  return state;
}
