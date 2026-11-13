// Supabase Realtime listener for the on-stage `live_sync_state` payload.
//
// The room key is `wzsd:<weddingId>` (D7); the display PIN is never part of it.
// In production the client is created with the role token returned by the
// `join_room` Edge Function, so PostgREST and Realtime requests carry the JWT
// that the RLS policies check.
//
// Contract used by `useLiveStageState`:
//   fetchLatest(roomKey)          -> { state, updated_at } | null
//   fetchServerTime()             -> epoch ms
//   publish(roomKey, state)       -> Promise<void>
//   subscribe(roomKey, handlers)  -> unsubscribe()
//   subscribeWedding(id, handlers)-> unsubscribe()   (publication hints)
//
// `onStatus` receives one of: 'connecting' | 'connected' | 'disconnected' |
// 'error'. The hook owns 'disabled' and 'offline'.

import { createClient } from '@supabase/supabase-js';

let sharedClient = null;
let sharedClientKey = '';

function getClient(url, anonKey, accessToken) {
  const key = `${url}::${anonKey}::${accessToken ?? 'anon'}`;
  if (!sharedClient || sharedClientKey !== key) {
    sharedClient = createClient(url, anonKey, {
      auth: {
        // The stage deck uses room/role tokens, not Supabase Auth sessions.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      ...(accessToken
        ? {
            global: { headers: { Authorization: `Bearer ${accessToken}` } },
            realtime: { params: { access_token: accessToken } },
          }
        : {}),
    });
    if (accessToken) {
      // Keeps the Realtime socket authorized after a reconnect.
      sharedClient.realtime.setAuth(accessToken);
    }
    sharedClientKey = key;
  }
  return sharedClient;
}

function describeError(error) {
  if (!error) return 'Unknown sync error';
  return error.message ?? String(error);
}

export function createSupabaseSyncClient(config, { accessToken = null } = {}) {
  const supabase = getClient(config.url, config.anonKey, accessToken);

  async function fetchLatest(roomKey) {
    const { data, error } = await supabase
      .from(config.table)
      .select('state, updated_at')
      .eq('wedding_id', roomKey)
      .maybeSingle();

    if (error) throw new Error(describeError(error));
    return data ?? null;
  }

  // Role-scoped cartridge fetch after a successful join. The RPC redacts
  // speeches for non-speaking roles and verifies the active session itself.
  // Presence heartbeat (issue #76). The RPC derives room/role/device from the
  // signed role token and refuses revoked/expired sessions.
  async function touchPresence(currentView = null) {
    const { error } = await supabase.rpc('stage_deck_touch_presence', {
      p_current_view: currentView,
    });
    if (error) throw new Error(describeError(error));
  }

  async function fetchWedding(weddingId) {
    if (!weddingId) return null;
    const { data, error } = await supabase.rpc('stage_deck_wedding');
    if (error) throw new Error(describeError(error));
    if (!data || data.wedding_id !== weddingId) return null;
    return data;
  }

  async function publish(roomKey, state) {
    const { error } = await supabase.from(config.table).upsert(
      {
        wedding_id: roomKey,
        state,
        // A DB trigger overwrites this with server `now()` when deployed, so
        // `updated_at` remains authoritative even if a device clock is wrong.
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'wedding_id' },
    );

    if (error) throw new Error(describeError(error));
  }

  // Server-authoritative clock for the reel clock's skew warning. Backed by the
  // `stage_deck_server_time()` SQL function. Returns epoch milliseconds.
  async function fetchServerTime() {
    const { data, error } = await supabase.rpc('stage_deck_server_time');
    if (error) throw new Error(describeError(error));
    const ms = typeof data === 'string' ? Date.parse(data) : Number(data);
    if (!Number.isFinite(ms)) throw new Error('Invalid server time response');
    return ms;
  }

  // Cartridge publication notifications are hints only (issue #167). The
  // consumer must fetch the authoritative wedding row after every hint.
  function subscribeWedding(weddingId, { onHint, onStatus } = {}) {
    onStatus?.('connecting');

    const channel = supabase
      .channel(`wzsd:wedding:${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weddings',
          filter: `wedding_id=eq.${weddingId}`,
        },
        (payload) => {
          const row = payload?.new;
          if (!row?.wedding_id) return;
          onHint?.({
            wedding_id: row.wedding_id,
            cartridge_revision: row.cartridge_revision,
            updated_at: row.updated_at,
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
    fetchWedding,
    fetchServerTime,
    touchPresence,
    publish,
    subscribe,
    subscribeWedding,
  };
}
