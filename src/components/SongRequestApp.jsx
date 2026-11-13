import { useEffect, useMemo, useRef, useState } from 'react';
import { getSyncConfig } from '../lib/sync/syncConfig.js';
import { useI18n } from '../i18n/useI18n.js';
import {
  normalizeRoomCode,
  normalizeSongRequestInput,
  probeSongRequestService,
  searchSongMetadata,
  submitSongRequest,
} from '../lib/songRequests.js';
import { getGuestDeviceId } from '../lib/guestDeviceId.js';
import LanguageToggle from './LanguageToggle';
import {
  clearGuestRequest,
  loadGuestRequest,
  saveGuestRequest,
  subscribeGuestRequestStatus,
} from '../lib/songRequestStatus.js';

const ACTIVE_STATUSES = new Set(['pending', 'accepted']);

function RequestSummary({ song, artist }) {
  const { t } = useI18n();
  if (!song && !artist) return null;
  return (
    <p className="mt-2 text-xs text-muted">
      {t('songRequest.yourRequest')}: <strong className="text-ink">{song}</strong>
      {artist ? <span> — {artist}</span> : null}
    </p>
  );
}

function StatusCard({ tone, title, body, song, artist, children }) {
  return (
    <div className={`mt-5 rounded-xl border p-4 ${tone}`} role="status" aria-live="polite">
      <div className="font-heading text-sm font-bold">{title}</div>
      <p className="mt-1 text-xs">{body}</p>
      <RequestSummary song={song} artist={artist} />
      {children}
    </div>
  );
}

export default function SongRequestApp({ roomCode, preview = false }) {
  const config = useMemo(() => getSyncConfig(), []);
  const { t } = useI18n();
  const code = normalizeRoomCode(roomCode);
  const [deviceId] = useState(() => getGuestDeviceId());
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [record, setRecord] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('checking');
  const [suggestions, setSuggestions] = useState([]);
  const [lookupState, setLookupState] = useState('idle');
  const skipLookupRef = useRef(false);

  const checkConnection = useMemo(
    () => async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setConnection('offline');
        return;
      }
      setConnection('checking');
      const reachable = await probeSongRequestService({ config });
      setConnection(reachable ? 'online' : 'offline');
    },
    [config],
  );

  useEffect(() => {
    if (!code || !config.enabled) return undefined;
    // eslint-disable-next-line react/set-state-in-effect -- sets the connection badge before probing the external song-request service
    checkConnection();

    const onOnline = () => checkConnection();
    const onOffline = () => setConnection('offline');
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkConnection();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [code, config, checkConnection]);

  useEffect(() => {
    if (!code) return;
    const stored = loadGuestRequest(code);
    if (!stored) return;
    // eslint-disable-next-line react/set-state-in-effect -- hydrates the form from the guest's local storage record
    setRecord(stored);
    setSong(stored.song);
    setArtist(stored.artist);
  }, [code]);

  useEffect(() => {
    if (!code || !config.enabled || record) return undefined;
    const term = `${song} ${artist}`.trim();
    if (term.length < 2) return undefined;
    if (skipLookupRef.current) {
      skipLookupRef.current = false;
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLookupState('searching');
      const result = await searchSongMetadata({
        config,
        song,
        artist,
        signal: controller.signal,
      });
      if (!active || result.aborted) return;
      setSuggestions(result.suggestions);
      setLookupState(result.unavailable ? 'unavailable' : 'done');
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [song, artist, code, config, record]);

  const status = record?.status ?? null;

  useEffect(() => {
    if (!code || !record?.requestId || !ACTIVE_STATUSES.has(status)) return undefined;
    return subscribeGuestRequestStatus({
      config,
      roomCode: code,
      requestId: record.requestId,
      deviceId: record.deviceId ?? deviceId,
      onUpdate: (update) => {
        setRecord((current) => {
          if (!current) return current;
          const next = {
            ...current,
            status: update.status,
            song: update.status === 'played' ? '' : update.song || current.song,
            artist: update.status === 'played' ? '' : update.artist || current.artist,
            playedAt: update.playedAt ?? current.playedAt ?? null,
          };
          saveGuestRequest(code, next);
          return next;
        });
      },
    });
  }, [code, config, record?.requestId, record?.deviceId, status, deviceId]);

  useEffect(() => {
    if (!ACTIVE_STATUSES.has(status)) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  const clearSuggestions = () => {
    skipLookupRef.current = false;
    setSuggestions([]);
    setLookupState('idle');
  };

  const handleArtistChange = (event) => {
    setArtist(event.target.value);
    clearSuggestions();
  };

  const handleSongChange = (event) => {
    setSong(event.target.value);
    clearSuggestions();
  };

  const applySuggestion = (suggestion) => {
    skipLookupRef.current = suggestion.title !== song || suggestion.artist !== artist;
    setSong(suggestion.title);
    setArtist(suggestion.artist);
    setSuggestions([]);
    setLookupState('idle');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (preview || sending || connection !== 'online') return;

    const input = normalizeSongRequestInput({ song, artist });
    if (!input.ok) {
      setError(t('songRequest.enterBoth'));
      return;
    }

    setSending(true);
    setError('');
    const result = await submitSongRequest({
      config,
      roomCode: code,
      deviceId,
      ...input.value,
    });
    setSending(false);

    if (result.ok) {
      const next = {
        requestId: result.requestId ?? null,
        deviceId,
        song: input.value.song,
        artist: input.value.artist,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };
      setRecord(next);
      saveGuestRequest(code, next);
      setSong('');
      setArtist('');
      clearSuggestions();
      return;
    }

    if (result.code === 'cooldown' && result.retryAfterMinutes) {
      setError(t('songRequest.cooldown', { minutes: result.retryAfterMinutes }));
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setConnection('offline');
    }
    setError(result.error || t('songRequest.errorGeneric'));
  };

  const resetForAnother = () => {
    clearGuestRequest(code);
    setRecord(null);
    setError('');
    setSong('');
    setArtist('');
    clearSuggestions();
  };

  if (!code) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-page px-4 text-ink">
        <section className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
          <h1 className="font-heading text-xl font-bold text-ink">{t('songRequest.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('songRequest.incompleteBody')}</p>
        </section>
      </main>
    );
  }

  if (!config.enabled) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-page px-4 text-ink">
        <section className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
          <h1 className="font-heading text-xl font-bold text-ink">{t('songRequest.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('songRequest.unavailableBody')}</p>
        </section>
      </main>
    );
  }

  const offline = connection !== 'online';
  const showForm = !record;
  const canShowNoMatch = song.trim().length >= 2 && artist.trim().length >= 2;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-4 py-8 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-soft">
              {t('songRequest.badge')}
            </div>
            <h1 className="mt-1 font-heading text-2xl font-bold text-ink">{t('songRequest.title')}</h1>
          </div>
          <LanguageToggle variant="cycle" />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('songRequest.intro')}</p>

        {connection === 'checking' ? (
          <p className="mt-4 rounded-lg border border-line bg-raised px-3 py-2 text-xs text-muted" role="status">
            {t('songRequest.checking')}
          </p>
        ) : null}
        {connection === 'offline' ? (
          <div className="mt-4 rounded-lg border border-amber-700 bg-amber-950/50 px-3 py-2 text-xs text-amber-200" role="status">
            <strong className="font-heading">{t('songRequest.offlineTitle')}</strong>
            <p className="mt-0.5">{t('songRequest.offlineBody')}</p>
            <button
              type="button"
              onClick={checkConnection}
              className="mt-2 rounded border border-line-strong bg-raised px-2.5 py-1 text-[11px] font-semibold text-ink"
            >
              {t('songRequest.retry')}
            </button>
          </div>
        ) : null}

        {record && status === 'pending' ? (
          <StatusCard
            tone="border-brand-strong/60 bg-brand/15 text-brand-tint"
            title={t('songRequest.pendingTitle')}
            body={t('songRequest.pendingBody')}
            song={record.song}
            artist={record.artist}
          />
        ) : null}

        {record && status === 'accepted' ? (
          <StatusCard
            tone="border-emerald-800 bg-emerald-950/50 text-emerald-200"
            title={t('songRequest.acceptedTitle')}
            body={t('songRequest.acceptedBody')}
            song={record.song}
            artist={record.artist}
          />
        ) : null}

        {record && status === 'declined' ? (
          <StatusCard
            tone="border-amber-800 bg-amber-950/50 text-amber-200"
            title={t('songRequest.declinedTitle')}
            body={t('songRequest.declinedBody')}
            song={record.song}
            artist={record.artist}
          >
            <button
              type="button"
              onClick={resetForAnother}
              className="mt-3 rounded border border-line-strong bg-raised px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-line"
            >
              {t('songRequest.another')}
            </button>
          </StatusCard>
        ) : null}

        {record && status === 'played' ? (
          <StatusCard
            tone="border-emerald-800 bg-emerald-950/50 text-emerald-200"
            title={t('songRequest.playedTitle')}
            body={t('songRequest.playedBody')}
          >
            <button
              type="button"
              onClick={resetForAnother}
              className="mt-3 rounded border border-line-strong bg-raised px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-line"
            >
              {t('songRequest.another')}
            </button>
          </StatusCard>
        ) : null}

        {showForm ? (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {preview ? (
              <p className="rounded-lg border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
                {t('songRequest.previewOnly')}
              </p>
            ) : null}
            <label className="block">
              <span className="font-heading text-xs font-semibold uppercase tracking-widest text-muted">
                {t('songRequest.artist')}
              </span>
              <input
                type="text"
                value={artist}
                onChange={handleArtistChange}
                maxLength={120}
                autoComplete="off"
                required
                className="mt-1 w-full rounded-lg border border-line-strong bg-page px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-strong"
                placeholder={t('songRequest.artistPlaceholder')}
              />
            </label>

            <label className="block">
              <span className="font-heading text-xs font-semibold uppercase tracking-widest text-muted">
                {t('songRequest.song')}
              </span>
              <input
                type="text"
                value={song}
                onChange={handleSongChange}
                maxLength={120}
                autoComplete="off"
                required
                className="mt-1 w-full rounded-lg border border-line-strong bg-page px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-strong"
                placeholder={t('songRequest.songPlaceholder')}
              />
            </label>

            {lookupState === 'searching' ? (
              <p className="text-xs text-muted" role="status">
                {t('songRequest.lookingUp')}
              </p>
            ) : null}

            {suggestions.length > 0 ? (
              <div className="rounded-lg border border-line bg-raised p-2" aria-live="polite">
                <p className="px-1 font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
                  {t('songRequest.suggestionsTitle')}
                </p>
                <ul className="mt-1 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={`${suggestion.title}-${suggestion.artist}-${index}`}>
                      <button
                        type="button"
                        onClick={() => applySuggestion(suggestion)}
                        className="w-full rounded px-2 py-1.5 text-left text-xs text-ink transition hover:bg-line"
                      >
                        <span className="block font-semibold">{suggestion.title}</span>
                        <span className="block text-muted">
                          {suggestion.artist}
                          {suggestion.album ? ` — ${suggestion.album}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 px-1 text-[10px] leading-relaxed text-muted">
                  {t('songRequest.suggestionsHint')}
                </p>
              </div>
            ) : null}

            {lookupState === 'done' && suggestions.length === 0 && canShowNoMatch ? (
              <p className="text-xs text-muted">{t('songRequest.lookupNoMatch')}</p>
            ) : null}

            {lookupState === 'unavailable' ? (
              <p className="text-xs text-muted">{t('songRequest.lookupUnavailable')}</p>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-alert/60 bg-alert/20 px-3 py-2 text-xs text-alert-soft" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={preview || sending || offline}
              className="w-full rounded-lg border border-brand-strong bg-brand px-4 py-2.5 text-sm font-bold text-on-accent transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? t('songRequest.sending') : t('songRequest.send')}
            </button>
          </form>
        ) : null}

        <p className="mt-5 text-[10px] leading-relaxed text-muted">{t('songRequest.privacy')}</p>
      </section>
    </main>
  );
}
