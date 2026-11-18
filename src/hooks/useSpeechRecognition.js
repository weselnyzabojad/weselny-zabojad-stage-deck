import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSpeechRecognitionSession,
  mapSpeechError,
  speechRecognitionCtor,
} from '../lib/speechRecognition.js';

// Native Web Speech API wrapper (issue #1172). Recognition starts only after a
// caller invokes `start()` — `enabled` reflects the UI consent state and stops
// an active session when consent is revoked.
export default function useSpeechRecognition({
  lang = 'EN',
  continuous = true,
  interimResults = true,
  enabled = false,
} = {}) {
  const [supported] = useState(() => Boolean(speechRecognitionCtor()));
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    if (!supported) return undefined;
    const session = createSpeechRecognitionSession({
      Recognition: speechRecognitionCtor(),
      lang,
      continuous,
      interimResults,
      onListening: setListening,
      onTranscript: setTranscript,
      onError: setError,
    });
    sessionRef.current = session;
    return () => {
      session.destroy();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [continuous, interimResults, lang, supported]);

  useEffect(() => {
    if (!enabled) sessionRef.current?.stop();
  }, [enabled]);

  const start = useCallback(() => {
    const session = sessionRef.current;
    if (!session) {
      setError(mapSpeechError('unsupported'));
      return;
    }
    session.start();
  }, []);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    sessionRef.current?.reset();
    setTranscript('');
    setError(null);
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}
