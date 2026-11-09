import { useState } from 'react';
import { getSyncConfig } from '../lib/sync/syncConfig.js';
import {
  normalizeRoomCode,
  normalizeSongRequestInput,
  submitSongRequest,
} from '../lib/songRequests.js';

export default function SongRequestApp({ roomCode }) {
  const config = getSyncConfig();
  const code = normalizeRoomCode(roomCode);
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;

    const input = normalizeSongRequestInput({ song, artist });
    if (!input.ok) {
      setError(input.error);
      return;
    }

    setStatus('sending');
    setError('');
    const result = await submitSongRequest({ config, roomCode: code, ...input.value });
    if (result.ok) {
      setSong('');
      setArtist('');
      setStatus('sent');
      return;
    }
    setError(result.error);
    setStatus('idle');
  };

  if (!code) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page px-4 text-ink">
        <section className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
          <h1 className="font-heading text-xl font-bold text-ink">Song request</h1>
          <p className="mt-2 text-sm text-muted">
            This request link is incomplete. Scan the QR code again.
          </p>
        </section>
      </main>
    );
  }

  if (!config.enabled) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page px-4 text-ink">
        <section className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
          <h1 className="font-heading text-xl font-bold text-ink">Song request</h1>
          <p className="mt-2 text-sm text-muted">
            Song requests are not available right now. Please ask the MC or DJ.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-8 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
        <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-soft">
          Guest request
        </div>
        <h1 className="mt-1 font-heading text-2xl font-bold text-ink">Request a song</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Send one song and artist to the DJ. No account or personal details are needed.
        </p>

        {status === 'sent' ? (
          <div className="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/50 p-4" role="status">
            <div className="font-heading text-sm font-bold text-emerald-300">
              Request received
            </div>
            <p className="mt-1 text-xs text-emerald-200">
              Thank you. The DJ will see it in the request queue.
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-3 rounded border border-line-strong bg-raised px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-line"
            >
              Send another request
            </button>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="font-heading text-xs font-semibold uppercase tracking-widest text-muted">
                Song
              </span>
              <input
                type="text"
                value={song}
                onChange={(event) => setSong(event.target.value)}
                maxLength={120}
                autoComplete="off"
                required
                className="mt-1 w-full rounded-lg border border-line-strong bg-page px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-strong"
                placeholder="Song title"
              />
            </label>

            <label className="block">
              <span className="font-heading text-xs font-semibold uppercase tracking-widest text-muted">
                Artist
              </span>
              <input
                type="text"
                value={artist}
                onChange={(event) => setArtist(event.target.value)}
                maxLength={120}
                autoComplete="off"
                required
                className="mt-1 w-full rounded-lg border border-line-strong bg-page px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-strong"
                placeholder="Artist"
              />
            </label>

            {error ? (
              <p className="rounded-lg border border-alert/60 bg-alert/20 px-3 py-2 text-xs text-alert-soft" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-lg border border-brand-strong bg-brand px-4 py-2.5 text-sm font-bold text-on-accent transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send request'}
            </button>
          </form>
        )}

        <p className="mt-5 text-[10px] leading-relaxed text-muted">
          Only the song and artist are sent. The queue and event details stay private.
        </p>
      </section>
    </main>
  );
}
