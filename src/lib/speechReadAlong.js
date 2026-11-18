// Bilingual speech read-along primitives (issue #1172).
//
// The matcher is deliberately tolerant: browser speech recognition returns
// unpunctuated, accent-stripped text with occasional substitutions. The cursor
// is monotonic so a late transcript can never highlight an earlier word.

export const SPEECH_LANGS = Object.freeze({
  PL: 'pl-PL',
  FR: 'fr-FR',
  EN: 'en-US',
});

const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu;

export function speechRecognitionLang(code) {
  const value = String(code ?? '').trim();
  if (!value) return 'en-US';
  const upper = value.toUpperCase();
  if (SPEECH_LANGS[upper]) return SPEECH_LANGS[upper];
  const base = upper.split('-')[0];
  if (SPEECH_LANGS[base]) return SPEECH_LANGS[base];
  return /^[A-Z]{2}$/.test(base) ? base.toLowerCase() : 'en-US';
}

export function normalizeWord(word) {
  return String(word ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function tokenizeScript(text) {
  const source = String(text ?? '');
  const tokens = [];
  WORD_PATTERN.lastIndex = 0;
  let match = WORD_PATTERN.exec(source);
  while (match) {
    tokens.push({
      word: match[0],
      normalized: normalizeWord(match[0]),
      start: match.index,
      end: match.index + match[0].length,
    });
    match = WORD_PATTERN.exec(source);
  }
  return tokens;
}

function editDistanceWithin(left, right, max) {
  if (Math.abs(left.length - right.length) > max) return max + 1;
  const previous = new Array(right.length + 1);
  const current = new Array(right.length + 1);
  for (let index = 0; index <= right.length; index += 1) previous[index] = index;
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    let rowMin = current[0];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + cost,
      );
      rowMin = Math.min(rowMin, current[rightIndex]);
    }
    if (rowMin > max) return max + 1;
    for (let index = 0; index <= right.length; index += 1) previous[index] = current[index];
  }
  return previous[right.length];
}

function wordsMatch(spoken, expected) {
  if (!spoken || !expected) return false;
  if (spoken === expected) return true;
  const shortest = Math.min(spoken.length, expected.length);
  if (shortest <= 4) return false;
  const tolerance = Math.max(1, Math.min(2, Math.floor(Math.max(spoken.length, expected.length) / 6)));
  return editDistanceWithin(spoken, expected, tolerance) <= tolerance;
}

/**
 * Match a transcript against tokens starting after `fromIndex`.
 *
 * `index` is the last matched token and never moves below `fromIndex`.
 * `consumed` is the number of transcript words examined up to that match.
 */
export function matchTranscript(tokens, fromIndex, transcript) {
  const safeTokens = Array.isArray(tokens) ? tokens : [];
  const from = Number.isInteger(fromIndex) ? fromIndex : -1;
  const words = String(transcript ?? '')
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);

  if (words.length === 0 || safeTokens.length === 0) {
    return { index: from, consumed: 0 };
  }

  let cursor = Math.max(0, from + 1);
  let matched = from;
  let consumed = 0;
  let wordIndex = 0;
  let skips = 0;

  while (wordIndex < words.length && cursor < safeTokens.length) {
    let found = -1;
    for (let lookAhead = 0; lookAhead <= 3 && cursor + lookAhead < safeTokens.length; lookAhead += 1) {
      if (wordsMatch(words[wordIndex], safeTokens[cursor + lookAhead].normalized)) {
        found = cursor + lookAhead;
        break;
      }
    }

    if (found >= 0) {
      matched = found;
      cursor = found + 1;
      consumed = wordIndex + 1;
      wordIndex += 1;
      skips = 0;
      continue;
    }

    if (skips >= 2) break;
    skips += 1;
    wordIndex += 1;
  }

  return { index: matched, consumed };
}
