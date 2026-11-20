// In-memory adapter from the decrypted speech pair shape to the shared
// BilingualScriptViewer blocks (issue #1174). No text is persisted here.

export function speechPairsToScriptBlocks(speech) {
  const pairs = Array.isArray(speech?.pairs) ? speech.pairs : [];
  if (pairs.length > 0) {
    return pairs.map((pair, index) => ({
      id: index,
      langA_text: typeof pair?.speaker === 'string' ? pair.speaker : '',
      langB_text: typeof pair?.translation === 'string' ? pair.translation : '',
    }));
  }

  const script =
    typeof speech?.script === 'string'
      ? speech.script
      : typeof speech?.script?.text === 'string'
        ? speech.script.text
        : '';
  return script ? [{ id: 0, langA_text: script, langB_text: '' }] : [];
}
