// Runtime configuration for the optional cloud sync layer.
//
// The app is offline-first: when these env vars are absent the stage deck keeps
// working exactly as before (localStorage only) and the sync client is simply
// never created. Vite only exposes variables prefixed with `VITE_` to the
// browser bundle, so the anon key below is the *public* key, never a service
// role key.

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
    missing,
  };
}

// Rows are namespaced so several deployments can share one Supabase project.
export function syncRoomKey(roomPrefix, roomId) {
  return `${roomPrefix}:${roomId}`;
}
