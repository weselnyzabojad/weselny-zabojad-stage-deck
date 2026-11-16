import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSyncConfig } from '../lib/sync/syncConfig.js';
import { createSupabaseSyncClient } from '../lib/sync/supabaseSyncClient.js';

// DJ VIP view of the durable musician suggestion table. The hook is disabled
// when there is no role token (for example the local demo), leaving the panel in
// its empty state instead of attempting an unauthenticated request.
export function useMusicianSuggestions({ accessToken = null, enabled = false } = {}) {
  const config = useMemo(() => getSyncConfig(), []);
  const client = useMemo(
    () =>
      enabled && accessToken && config.enabled
        ? createSupabaseSyncClient(config, { accessToken })
        : null,
    [enabled, accessToken, config],
  );
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(Boolean(client));
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!client) return;
    try {
      const rows = await client.fetchMusicianSuggestions();
      setSuggestions(rows);
      setError(null);
    } catch (cause) {
      setError(cause?.message ?? 'Could not load musician suggestions.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!client) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    void refresh();
    const unsubscribe = client.subscribeMusicianSuggestions({
      onChange: () => {
        void refresh();
      },
    });
    return unsubscribe;
  }, [client, refresh]);

  const markPlayed = useCallback(
    async (id) => {
      if (!client || !id) return;
      await client.markMusicianSuggestionPlayed(id);
      await refresh();
    },
    [client, refresh],
  );

  return { suggestions, loading, error, markPlayed };
}

export default useMusicianSuggestions;
