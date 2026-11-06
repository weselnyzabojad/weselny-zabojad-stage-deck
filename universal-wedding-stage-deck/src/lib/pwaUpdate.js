// Issue #81: decide whether the live UI may reload for a PWA update.
//
// A reload is blocked while a step is live, a speech is active, or any overlay
// is open. The update banner stays visible with "Later"; "Reload now" is
// disabled until the stage is safe. Messages follow the per-device UI language
// (issue #78).
import { t } from '../i18n/index.js';

export function resolvePwaReloadBlock({
  overlay = null,
  activeSpeech = false,
  activeStepId = null,
} = {}) {
  if (overlay) return t('pwa.blockedOverlay');
  if (activeSpeech) return t('pwa.blockedSpeech');
  if (activeStepId) return t('pwa.blockedStep');
  return null;
}
