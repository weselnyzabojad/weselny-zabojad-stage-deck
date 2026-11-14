// Wedding-level speech mode. Speech records, scripts and redactions live in the
// dedicated encrypted bundle (issues #923-#929), never in the wedding cartridge.

export const SPEECH_MODES = ['OFF', 'LIGHT', 'COMPLEX'];

export function normalizeSpeechMode(value) {
  return SPEECH_MODES.includes(value) ? value : null;
}

// Wedding-level default. Older cartridges with legacy speeches but no explicit
// mode are treated as COMPLEX until the owner migrates them.
export function resolveSpeechMode(wedding, speeches = []) {
  return normalizeSpeechMode(wedding?.speechMode) ?? (speeches.length > 0 ? 'COMPLEX' : 'OFF');
}
