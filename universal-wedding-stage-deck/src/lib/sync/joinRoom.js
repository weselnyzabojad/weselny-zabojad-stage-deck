// Client for the production `join_room` Edge Function.
//
// Sends the 6-digit role PIN over HTTPS to the server, which validates the hash,
// rate-limits failures and returns a role-scoped JWT. The PIN itself is never
// stored locally or in the cartridge.

import { getSyncConfig } from './syncConfig.js';

const STATUS_MESSAGES = {
  400: 'Enter the 6-digit PIN for this role.',
  401: 'Incorrect PIN for this role.',
  403: 'This role is not available for this room.',
  404: 'Room not found. Check the share link.',
  429: 'Too many attempts. This role is locked for 15 minutes.',
  503: 'The join service is unavailable. Try again shortly.',
};

export async function joinRoom({ roomCode, role, pin }) {
  const config = getSyncConfig();
  if (!config.enabled) {
    return {
      ok: false,
      error: 'Cloud is not configured for this build. Ask the MC for the deployment URL.',
    };
  }

  const endpoint = `${config.functionsUrl}/join_room`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
      body: JSON.stringify({ roomCode, role, pin }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data?.error || STATUS_MESSAGES[response.status] || 'Could not join the room.',
      };
    }

    return { ok: true, session: data };
  } catch {
    return {
      ok: false,
      error: 'Network error — the first join needs a connection.',
    };
  }
}
