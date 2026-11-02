// Supabase Realtime listener for the on-stage `live_sync_state` payload.
//
// The client intentionally mirrors the shape persisted in localStorage
// (`WeddingSchema v1.1` -> `live_sync_state`) so a payload can be pushed to the
// cloud untouched and re-hydrated on another device with `normalizeLiveState`.
//
// Contract used by `useLiveStageState`:
//   fetchLatest(roomKey)          -> { state, updated_at, pin } | null
//   publish(roomKey, state, meta) -> Promise<void>
//   subscribe(roomKey, handlers)  -> unsubscribe()
//
// `onStatus` receives one of: 'connecting' | 'connected' | 'disconnected' |
// 'error'. The hook owns 'disabled' and 'offline'.

import { createClient } from '@supabase/supabase-js';

let sharedClient = null;
let sharedClientKey = '';

function getClient(url, anonKey) {
  const key = `${url}::${anonKey}`;
  if (!sharedClient || sharedClientKey !== key) {
    sharedClient = createClient(url, anonKey, {
      auth: {
        // The stage deck uses room PINs, not Supabase Auth sessions. Keeping
        // this off avoids writing session tokens into localStorage.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    sharedClientKey = key;
  }
  return sharedClient;
}

function describeError(error) {
  if (!error) return 'Unknown sync error';
  return error.message ?? String(error);
}

export function createSupabaseSyncClient(config) {
  const supabase = getClient(config.url, config.anonKey);

  async function fetchLatest(roomKey) {
    const { data, error } = await supabase
      .from(config.table)
      .select('state, updated_at, pin')
      .eq('wedding_id', roomKey)
      .maybeSingle();

    if (error) throw new Error(describeError(error));
    return data ?? null;
  }

  async function publish(roomKey, state, { pin = null } = {}) {
    const { error } = await supabase.from(config.table).upsert(
      {
        wedding_id: roomKey,
        pin,
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'wedding_id' },
    );

    if (error) throw new Error(describeError(error));
  }

  function subscribe(roomKey, { onState, onStatus } = {}) {
    onStatus?.('connecting');

    const channel = supabase
      .channel(`wzsd:${roomKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: config.table,
          filter: `wedding_id=eq.${roomKey}`,
        },
        (payload) => {
          const row = payload?.new;
          if (!row?.state) return;
          onState?.({
            state: row.state,
            updated_at: row.updated_at,
            pin: row.pin,
          });
        },
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          onStatus?.('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          onStatus?.('error', describeError(error));
        } else if (status === 'CLOSED') {
          onStatus?.('disconnected');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }

  return {
    provider: 'supabase',
    fetchLatest,
    publish,
    subscribe,
  };
}
