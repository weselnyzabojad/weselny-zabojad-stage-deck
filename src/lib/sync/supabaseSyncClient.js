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

  // Venue Manager package correction (issue #1309). The RPC derives the
  // wedding and role from the signed token and updates only the cartridge
  // value; it never re-provisions roles, PINs, sessions or VIP identities.
  async function setServicePackage(servicePackage) {
    if (!servicePackage) throw new Error('Service package is required.');
    const { data, error } = await supabase.rpc('stage_deck_set_service_package', {
      p_service_package: servicePackage,
    });
    if (error) throw new Error(describeError(error));
    return data;
  }

  // Media briefing note (issue #1310). Media roles cannot write the room table
  // directly, so this scoped RPC updates only `photographer_notes`.
  async function setPhotographerNotes(notes) {
    const { data, error } = await supabase.rpc('stage_deck_set_photographer_notes', {
      p_notes: notes,
    });
    if (error) throw new Error(describeError(error));
    return data;
  }

  // Read receipts (issue #1159). The RPC derives wedding/role/device from the
  // signed role token, so the ack payload only names the step and revision.
  async function ackStepReceipt({ stepId, revision } = {}) {
    if (!stepId || !revision) throw new Error('Step and revision are required.');
    const { error } = await supabase.rpc('stage_deck_ack_step', {
      p_step_id: stepId,
      p_revision: revision,
    });
    if (error) throw new Error(describeError(error));
  }

  async function fetchStepReceipts({ stepId, revision } = {}) {
    if (!stepId || !revision) return [];
    const { data, error } = await supabase.rpc('stage_deck_step_receipts', {
      p_step_id: stepId,
      p_revision: revision,
    });
    if (error) throw new Error(describeError(error));
    return Array.isArray(data) ? data : [];
  }

  // INSERT hints only: the consumer refetches or merges the row. `revision` is
  // compared after parsing because Postgres renders timestamptz differently
  // from the ISO string carried by the live-state payload.
  function subscribeStepReceipts({ stepId, revision, onChange, onStatus } = {}) {
    if (!stepId) return () => {};
    const channel = supabase
      .channel(`wzsd:step-receipts:${stepId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stage_step_receipts',
          filter: `step_id=eq.${stepId}`,
        },
        (payload) => {
          const row = payload?.new;
          if (!row || row.step_id !== stepId) return;
          if (revision && Date.parse(row.revision) !== Date.parse(revision)) return;
          onChange?.(row);
        },
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') onStatus?.('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          onStatus?.('error', describeError(error));
        } else if (status === 'CLOSED') {
          onStatus?.('disconnected');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }

  async function fetchRolePresence() {
    const { data, error } = await supabase.rpc('stage_deck_role_presence');
    if (error) throw new Error(describeError(error));
    return Array.isArray(data) ? data : [];
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

  // DJ VIP musician-preferred-music list (issue #1098). Reads are scoped by RLS
  // to the role token's wedding; only the DJ update path marks a row played.
  async function fetchMusicianSuggestions() {
    const { data, error } = await supabase
      .from('musician_song_suggestions')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(describeError(error));
    return data ?? [];
  }

  async function markMusicianSuggestionPlayed(id) {
    if (!id) return;
    const { error } = await supabase
      .from('musician_song_suggestions')
      .update({ status: 'played', played_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending');
    if (error) throw new Error(describeError(error));
  }

  async function createMusicianSuggestion({ musicianId, song, artist, note = null, stepId = null }) {
    if (!musicianId || !song || !artist) throw new Error('Musician, song and artist are required.');
    const { data, error } = await supabase
      .from('musician_song_suggestions')
      .insert({
        musician_id: musicianId,
        song,
        artist,
        note: note || null,
        step_id: stepId || null,
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) throw new Error(describeError(error));
    return data;
  }

  async function updateMusicianSuggestion(id, { song, artist, note = null, stepId = null }) {
    if (!id) return;
    const { error } = await supabase
      .from('musician_song_suggestions')
      .update({ song, artist, note: note || null, step_id: stepId || null })
      .eq('id', id)
      .eq('status', 'pending');
    if (error) throw new Error(describeError(error));
  }

  async function deleteMusicianSuggestion(id) {
    if (!id) return;
    const { error } = await supabase
      .from('musician_song_suggestions')
      .delete()
      .eq('id', id)
      .eq('status', 'pending');
    if (error) throw new Error(describeError(error));
  }

  function subscribeMusicianSuggestions({ onChange, onStatus } = {}) {
    const channel = supabase
      .channel(`wzsd:musician-suggestions:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'musician_song_suggestions',
        },
        (payload) => onChange?.(payload),
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') onStatus?.('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          onStatus?.('error', describeError(error));
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
    setServicePackage,
    setPhotographerNotes,
    touchPresence,
    ackStepReceipt,
    fetchStepReceipts,
    subscribeStepReceipts,
    fetchRolePresence,
    publish,
    subscribe,
    subscribeWedding,
    fetchMusicianSuggestions,
    markMusicianSuggestionPlayed,
    createMusicianSuggestion,
    updateMusicianSuggestion,
    deleteMusicianSuggestion,
    subscribeMusicianSuggestions,
  };
}
