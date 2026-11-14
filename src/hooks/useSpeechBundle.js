import { useEffect, useState } from 'react';
import {
  endLiveSpeech,
  fetchSpeechList,
  fetchSpeechScript,
  startLiveSpeech,
} from '../lib/speechBundleClient.js';

function normalizeSpeech(record) {
  return {
    id: record.id,
    order: record.order,
    mode: 'COMPLEX',
    speaker: record.speaker ?? { name: 'Speaker', relationship: null },
    speakerLanguage: record.speakerLanguage ?? null,
    mcLanguage: record.mcLanguage ?? null,
    speakerAccess: record.speakerAccess === true,
    status: record.status,
    revision: record.revision ?? null,
    publishedAt: record.publishedAt ?? null,
    script: record.script
      ? { ready: true, entry: record.script, keyVersion: record.script.keyVersion ?? 1 }
      : { ready: false, entry: null, keyVersion: null },
  };
}

// MC-side bundle: list metadata immediately, decrypt a script only when opened.
// Decrypted copies stay cached until logout (handled by the app sign-out).
export default function useSpeechBundle({ session, weddingId, enabled = true }) {
  const accessToken = session?.token ?? null;
  const [state, setState] = useState({
    status: 'idle',
    speeches: [],
    liveSpeechId: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !accessToken || !weddingId) return undefined;
    let active = true;
    const run = async () => {
      try {
        const data = await fetchSpeechList({ accessToken });
        if (!active) return;
        setState({
          status: 'ready',
          speeches: (data.speeches ?? []).map(normalizeSpeech),
          liveSpeechId: data.liveSpeechId ?? null,
          error: null,
        });
      } catch {
        if (active) {
          setState({
            status: 'error',
            speeches: [],
            liveSpeechId: null,
            error: 'The speech bundle is unavailable.',
          });
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [accessToken, enabled, weddingId]);

  const openSpeech = (speech) =>
    fetchSpeechScript({
      accessToken,
      weddingId,
      speechId: speech.id,
      speech,
    });

  const startSpeech = async (speech) => {
    const result = await startLiveSpeech({ accessToken, speechId: speech.id });
    setState((current) => ({
      ...current,
      liveSpeechId: result.liveSpeechId ?? speech.id,
    }));
    return result;
  };

  const endSpeech = async () => {
    await endLiveSpeech({ accessToken });
    setState((current) => ({ ...current, liveSpeechId: null }));
  };

  return {
    ...state,
    openSpeech,
    startSpeech,
    endSpeech,
  };
}
