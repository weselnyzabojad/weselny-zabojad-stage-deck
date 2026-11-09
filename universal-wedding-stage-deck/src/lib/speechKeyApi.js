// Role-authorized speech key endpoint (issue #602).

import { getSyncConfig } from './sync/syncConfig.js';

export async function fetchSpeechKey({ accessToken, speechId, keyVersion = 1 } = {}) {
  const config = getSyncConfig();
  if (!config.enabled || !config.functionsUrl) {
    throw new Error('Speech unlock is unavailable without Supabase configuration.');
  }
  if (!accessToken) throw new Error('Join the room as the speaker first.');

  const response = await fetch(`${config.functionsUrl}/reveal_speech_key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ speechId, keyVersion }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.key) {
    const error = new Error(data?.error || 'Could not unlock the speech.');
    error.status = response.status;
    throw error;
  }
  return data;
}
