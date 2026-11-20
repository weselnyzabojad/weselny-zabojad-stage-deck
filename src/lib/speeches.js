// Wedding-level speech mode. Speech records, scripts and redactions live in the
// dedicated encrypted bundle (issues #923-#929), never in the wedding cartridge.

export const SPEECH_MODES = ['OFF', 'LIGHT', 'COMPLEX'];

export function normalizeSpeechMode(value) {
  return SPEECH_MODES.includes(value) ? value : null;
}

// Issue #974: the stored wedding cartridge is the only speech Doc
// authorization source. Only COMPLEX may create a Doc; LIGHT stays
// metadata-only. Client mode values are never consulted.
export function speechDocCreationAuthorization(cartridge) {
  const mode = normalizeSpeechMode(cartridge?.speechMode);
  if (!mode) {
    return {
      allowed: false,
      mode: null,
      code: 'missing_speech_mode',
      error: 'The wedding Doc has no Speech mode. Set Speech mode: COMPLEX under ## SPEECHES.',
    };
  }
  if (mode !== 'COMPLEX') {
    return {
      allowed: false,
      mode,
      code: 'speech_mode_not_complex',
      error: `Speech mode is ${mode} in the wedding Doc. Set Speech mode: COMPLEX to create speech Docs.`,
    };
  }
  return { allowed: true, mode, code: null };
}

// Wedding-level default. Older cartridges with legacy speeches but no explicit
// mode are treated as COMPLEX until the owner migrates them.
export function resolveSpeechMode(wedding, speeches = []) {
  return normalizeSpeechMode(wedding?.speechMode) ?? (speeches.length > 0 ? 'COMPLEX' : 'OFF');
}
