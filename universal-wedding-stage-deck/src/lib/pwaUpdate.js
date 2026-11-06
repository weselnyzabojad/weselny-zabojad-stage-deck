// Issue #81: decide whether the live UI may reload for a PWA update.
//
// A reload is blocked while a step is live, a speech is active, or any overlay
// is open. The update banner stays visible with "Later"; "Reload now" is
// disabled until the stage is safe.

export function resolvePwaReloadBlock({
  overlay = null,
  activeSpeech = false,
  activeStepId = null,
} = {}) {
  if (overlay) return 'Close the open panel before reloading the deck.';
  if (activeSpeech) return 'A speech is live. Reload after the speech ends.';
  if (activeStepId) return 'A step is live. Reload after the event or in a safe gap.';
  return null;
}
