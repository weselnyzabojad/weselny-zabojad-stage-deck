// Browser speech-recognition session controller (issue #1172).
//
// The controller owns the native SpeechRecognition instance and the silence
// restart loop. It accepts an injected constructor and timers so the restart
// and error behaviour can be tested without a browser.

import { SPEECH_LANGS, speechRecognitionLang } from './speechReadAlong.js';

export { SPEECH_LANGS, speechRecognitionLang };

export const SPEECH_ERROR_CODES = Object.freeze([
  'unsupported',
  'denied',
  'no-microphone',
  'network',
  'language',
  'aborted',
  'unknown',
]);

const ERROR_MESSAGES = Object.freeze({
  unsupported: 'Speech recognition is not available in this browser.',
  denied: 'Microphone permission was denied. Manual reading still works.',
  'no-microphone': 'No microphone is available. Manual reading still works.',
  network: 'Speech recognition lost its network connection.',
  language: 'The selected language is not supported by this browser.',
  aborted: 'Speech recognition was stopped.',
  unknown: 'Speech recognition stopped unexpectedly.',
});

const NO_RESTART_ERRORS = new Set(['denied', 'no-microphone', 'language', 'aborted']);

const ERROR_ALIASES = Object.freeze({
  'not-allowed': 'denied',
  'service-not-allowed': 'denied',
  'audio-capture': 'no-microphone',
  'language-not-supported': 'language',
});

export function mapSpeechError(code) {
  const aliased = ERROR_ALIASES[code] ?? code;
  const normalized = SPEECH_ERROR_CODES.includes(aliased) ? aliased : 'unknown';
  return { code: normalized, message: ERROR_MESSAGES[normalized] };
}

export function speechRecognitionCtor(win = typeof window !== 'undefined' ? window : null) {
  return win?.SpeechRecognition ?? win?.webkitSpeechRecognition ?? null;
}

export function mergeTranscriptResults(previousFinal, event) {
  let final = String(previousFinal ?? '');
  let interim = '';
  const results = event?.results ?? [];
  const start = Number.isInteger(event?.resultIndex) ? event.resultIndex : 0;

  for (let index = start; index < results.length; index += 1) {
    const result = results[index];
    const alternative = result?.[0] ?? result;
    const text = typeof alternative?.transcript === 'string' ? alternative.transcript : '';
    if (result?.isFinal) final += text;
    else interim += text;
  }

  return { final, interim, text: `${final}${interim}` };
}

export function createSpeechRecognitionSession({
  Recognition,
  lang = 'EN',
  continuous = true,
  interimResults = true,
  onListening = () => {},
  onTranscript = () => {},
  onError = () => {},
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  restartBaseMs = 800,
  restartMaxMs = 8000,
} = {}) {
  let recognition = null;
  let intent = false;
  let destroyed = false;
  let listening = false;
  let finalText = '';
  let interimText = '';
  let restartTimer = null;
  let attempts = 0;

  function emitTranscript() {
    if (!destroyed) onTranscript(`${finalText}${interimText}`);
  }

  function setListening(value) {
    if (listening === value) return;
    listening = value;
    if (!destroyed) onListening(value);
  }

  function clearRestart() {
    if (restartTimer != null) {
      clearTimer(restartTimer);
      restartTimer = null;
    }
  }

  function scheduleRestart() {
    if (!intent || destroyed || restartTimer != null) return;
    const delay = Math.min(restartMaxMs, restartBaseMs * 2 ** Math.min(attempts, 4));
    attempts += 1;
    restartTimer = setTimer(() => {
      restartTimer = null;
      if (intent && !destroyed) startRecognition();
    }, delay);
  }

  function startRecognition() {
    if (!Recognition) {
      const error = mapSpeechError('unsupported');
      if (!destroyed) onError(error);
      return false;
    }
    if (!recognition) {
      recognition = new Recognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.onstart = () => {
        attempts = 0;
        if (!destroyed) onError(null);
        setListening(true);
      };
      recognition.onresult = (event) => {
        attempts = 0;
        const merged = mergeTranscriptResults(finalText, event);
        finalText = merged.final;
        interimText = merged.interim;
        emitTranscript();
      };
      recognition.onerror = (event) => {
        const error = mapSpeechError(event?.error);
        if (!destroyed) onError(error);
        if (NO_RESTART_ERRORS.has(error.code)) {
          intent = false;
          clearRestart();
        }
        setListening(false);
      };
      recognition.onend = () => {
        setListening(false);
        if (intent && !destroyed) scheduleRestart();
      };
    } else {
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
    }
    recognition.lang = speechRecognitionLang(lang);
    try {
      recognition.start();
      return true;
    } catch {
      const error = mapSpeechError('unknown');
      if (!destroyed) onError(error);
      scheduleRestart();
      return false;
    }
  }

  function start() {
    if (destroyed) return false;
    intent = true;
    attempts = 0;
    clearRestart();
    return startRecognition();
  }

  function stop() {
    intent = false;
    clearRestart();
    if (recognition) {
      try {
        recognition.abort();
      } catch {
        // A browser can throw when aborting an already-ended session.
      }
    }
    setListening(false);
  }

  function reset() {
    finalText = '';
    interimText = '';
    if (!destroyed) {
      onTranscript('');
      onError(null);
    }
  }

  function destroy() {
    destroyed = true;
    stop();
    recognition = null;
  }

  return {
    start,
    stop,
    reset,
    destroy,
    isListening: () => listening,
  };
}
