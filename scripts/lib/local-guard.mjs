// Shared local-only guard for Docker/seed/integration tooling (issue #919).
// Accepts only the local Supabase hostnames; never a hosted project ref.

export const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLocalSupabaseUrl(url) {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function assertLocalSupabaseUrl(url, label = 'Supabase URL') {
  if (!url) throw new Error(`${label} is missing. Run \`npm run local:start\` first.`);
  if (!isLocalSupabaseUrl(url)) {
    throw new Error(
      `${label} points at a hosted project. Local tooling refuses to write to non-local targets. Use http://127.0.0.1:54321.`,
    );
  }
  return url;
}
