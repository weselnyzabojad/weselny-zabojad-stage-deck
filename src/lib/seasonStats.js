// Public season stats client (issue #1217). Uses the anon key only; the RPC is
// the sole public read path and returns aggregates without PII.

import { getSyncConfig } from './sync/syncConfig.js';

export function seasonStatsRpcUrl(config) {
  return `${String(config?.url ?? '').replace(/\/+$/, '')}/rest/v1/rpc/get_public_season_stats`;
}

export async function fetchSeasonStats({
  config = getSyncConfig(),
  fetchImpl = fetch,
  seasonYear = null,
} = {}) {
  if (!config?.enabled) {
    throw new Error('Season stats are not configured for this build.');
  }
  const response = await fetchImpl(seasonStatsRpcUrl(config), {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(
      Number.isInteger(seasonYear) ? { p_season_year: seasonYear } : {},
    ),
  });
  if (!response.ok) {
    throw new Error(`Season stats request failed (${response.status})`);
  }
  return response.json();
}
