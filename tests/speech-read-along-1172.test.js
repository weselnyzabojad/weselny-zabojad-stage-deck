import { describe, expect, it } from 'vitest';
import {
  SPEECH_LANGS,
  matchTranscript,
  normalizeWord,
  speechRecognitionLang,
  tokenizeScript,
} from '../src/lib/speechReadAlong.js';

function reconstruct(text, tokens) {
  let output = '';
  let cursor = 0;
  for (const token of tokens) {
    output += text.slice(cursor, token.start);
    output += token.word;
    cursor = token.end;
  }
  return output + text.slice(cursor);
}

describe('issue #1172 speech read-along', () => {
  it('maps PL, FR and EN, with a safe fallback', () => {
    expect(SPEECH_LANGS).toEqual({ PL: 'pl-PL', FR: 'fr-FR', EN: 'en-US' });
    expect(speechRecognitionLang('PL')).toBe('pl-PL');
    expect(speechRecognitionLang('fr')).toBe('fr-FR');
    expect(speechRecognitionLang('EN')).toBe('en-US');
    expect(speechRecognitionLang('DE')).toBe('de');
    expect(speechRecognitionLang('')).toBe('en-US');
    expect(speechRecognitionLang('pl-PL')).toBe('pl-PL');
  });

  it('normalizes accents, case and punctuation', () => {
    expect(normalizeWord('Élodie,')).toBe('elodie');
    expect(normalizeWord('PAŃSTWU!')).toBe('panstwu');
    expect(normalizeWord("l'homme")).toBe('lhomme');
  });

  it('tokenizes words and keeps the original text reconstructable', () => {
    const text = "Bonjour, je m'appelle Élodie !";
    const tokens = tokenizeScript(text);
    expect(tokens.map((token) => token.word)).toEqual([
      'Bonjour',
      'je',
      "m'appelle",
      'Élodie',
    ]);
    expect(reconstruct(text, tokens)).toBe(text);
    expect(tokens[0]).toMatchObject({ normalized: 'bonjour', start: 0, end: 7 });
  });

  it('matches accented transcript words exactly after normalization', () => {
    const tokens = tokenizeScript('Dobry wieczór Państwu');
    expect(matchTranscript(tokens, -1, 'dobry wieczor panstwu')).toEqual({
      index: 2,
      consumed: 3,
    });
  });

  it('tolerates one ASR substitution in longer words', () => {
    const tokens = tokenizeScript('wszystkiego najlepszego');
    expect(matchTranscript(tokens, -1, 'wszystkiegp najlepszego')).toEqual({
      index: 1,
      consumed: 2,
    });
  });

  it('skips a missed word and looks ahead', () => {
    const tokens = tokenizeScript('raz dwa trzy cztery');
    expect(matchTranscript(tokens, -1, 'raz trzy cztery')).toEqual({
      index: 3,
      consumed: 3,
    });
  });

  it('never highlights backwards', () => {
    const tokens = tokenizeScript('raz dwa trzy cztery');
    expect(matchTranscript(tokens, 2, 'raz dwa')).toEqual({ index: 2, consumed: 0 });
  });

  it('returns the original cursor for empty input', () => {
    const tokens = tokenizeScript('raz dwa');
    expect(matchTranscript(tokens, 1, '')).toEqual({ index: 1, consumed: 0 });
    expect(matchTranscript([], 0, 'raz')).toEqual({ index: 0, consumed: 0 });
  });
});
