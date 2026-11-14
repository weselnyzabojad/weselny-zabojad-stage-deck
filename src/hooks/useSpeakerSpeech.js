import { useEffect, useState } from 'react';
import {
  clearSpeakerAccessCache,
  fetchSpeakerSpeech,
  loadSpeakerSpeech,
  saveSpeakerSpeech,
} from '../lib/speechBundleClient.js';

// Loads the speaker's own encrypted speech after a per-speech join (issue #926).
// A cached copy keeps the teleprompter usable offline; a revocation clears it.
export default function useSpeakerSpeech({ session, weddingId }) {
  const speechId = session?.speechId ?? null;
  const accessToken = session?.token ?? null;
  const expiresAt = session?.expiresAt ?? null;
  const [state, setState] = useState(() =>
    speechId ? { status: 'loading', speech: null, fromCache: false } : { status: 'idle', speech: null, fromCache: false },
  );

  useEffect(() => {
    if (!speechId || !accessToken || !weddingId) return undefined;

    let active = true;
    const run = async () => {
      try {
        const speech = await fetchSpeakerSpeech({ accessToken, weddingId, speechId });
        if (!active) return;
        saveSpeakerSpeech({ weddingId, speechId, speech, expiresAt });
        setState({ status: 'ready', speech, fromCache: false });
      } catch (error) {
        if (!active) return;
        if (error?.status === 401 || error?.status === 403) {
          await clearSpeakerAccessCache({ weddingId, speechId });
          if (active) setState({ status: 'revoked', speech: null, fromCache: false });
          return;
        }
        const cached = loadSpeakerSpeech(weddingId, speechId);
        if (cached) {
          setState({ status: 'ready', speech: cached, fromCache: true });
        } else {
          setState({ status: 'error', speech: null, fromCache: false });
        }
      }
    };

    void run();
    const onOnline = () => {
      void run();
    };
    window.addEventListener('online', onOnline);
    return () => {
      active = false;
      window.removeEventListener('online', onOnline);
    };
  }, [accessToken, expiresAt, speechId, weddingId]);

  return state;
}
