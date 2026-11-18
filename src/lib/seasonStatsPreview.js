// Dev/recette-only preview switch for the public season widget (issue #1246).
// The query parameter is parsed everywhere, but only honoured when this returns
// true; production builds without the flag ignore it.

export const PREVIEW_STATES = Object.freeze(['pre', 'live', 'post']);

export function isEmbedPreviewEnabled(env = import.meta.env) {
  return Boolean(env?.DEV) || env?.VITE_EMBED_PREVIEW === '1';
}

export function normalisePreviewState(value) {
  const state = String(value ?? '').trim().toLowerCase();
  return PREVIEW_STATES.includes(state) ? state : null;
}
