// Runtime configuration for the optional cloud sync layer.
//
// The app is offline-first: when these env vars are absent the stage deck keeps
// working exactly as before (localStorage only) and the sync client is simply
// never created. Vite only exposes variables prefixed with `VITE_` to the
// browser bundle, so the anon key below is the *public* key, never a service
// role key.
//
// `VITE_DECK_MODE`:
//   - "local" (default): DDMM display PIN gate, room key `wzsd:<weddingId>`.
//   - "production": server-validated per-role PINs via the `join_room` Edge
//     Function; the returned role token is sent with every Supabase request.

const DEFAULT_TABLE = 'live_sync_state';
const DEFAULT_ROOM_PREFIX = 'wzsd';

function readEnv(env, name) {
  const value = env?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function getSyncConfig(env = import.meta.env) {
  const url = readEnv(env, 'VITE_SUPABASE_URL');
  const anonKey = readEnv(env, 'VITE_SUPABASE_ANON_KEY');
  const table = readEnv(env, 'VITE_SUPABASE_SYNC_TABLE') || DEFAULT_TABLE;
  const roomPrefix = readEnv(env, 'VITE_SUPABASE_ROOM_PREFIX') || DEFAULT_ROOM_PREFIX;
  const deckMode = readEnv(env, 'VITE_DECK_MODE') === 'production' ? 'production' : 'local';

  const missing = [];
  if (!url) missing.push('VITE_SUPABASE_URL');
  if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  return {
    provider: 'supabase',
    enabled: missing.length === 0,
    url,
    anonKey,
    table,
    roomPrefix,
    deckMode,
    isProduction: deckMode === 'production',
    functionsUrl: url ? `${url.replace(/\/+$/, '')}/functions/v1` : '',
    missing,
  };
}

// The room key is `wzsd:<weddingId>` (D7). The PIN is never part of it.
export function syncRoomKey(roomPrefix, roomId) {
  return `${roomPrefix}:${roomId}`;
}
