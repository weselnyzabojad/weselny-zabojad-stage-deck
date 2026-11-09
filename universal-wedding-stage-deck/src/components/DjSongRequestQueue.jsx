import { useCallback, useEffect, useMemo, useState } from 'react';
import QrCodeImage from './QrCodeImage';
import { getSyncConfig } from '../lib/sync/syncConfig.js';
import { buildSongRequestUrl } from '../lib/songRequests.js';
import {
  canModerateSongRequests,
  fetchSongRequests,
  partitionSongRequests,
  updateSongRequestStatus,
} from '../lib/songRequestQueue.js';

function RequestTime({ value }) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return (
    <span className="font-mono text-[9px] text-muted">
      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

export function SongRequestQueueList({
  requests = [],
  loading = false,
  error = '',
  notice = '',
  updatingId = null,
  requestUrl = null,
  onAccept = () => {},
  onDecline = () => {},
  onRefresh = () => {},
}) {
  const { pending, accepted, declined } = partitionSongRequests(requests);

  return (
    <section className="rounded-xl border border-brand-strong/50 bg-card/95 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-brand-soft">
            💬 Guest requests
          </h2>
          <p className="mt-0.5 text-[10px] text-muted">
            {pending.length} pending · accept or decline
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand-tint">
            VIP · desktop
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded border border-line-strong bg-raised px-2 py-0.5 text-[10px] font-semibold text-ink transition hover:bg-line disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {requestUrl ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-line bg-page/70 p-2.5">
          <div className="rounded bg-white p-1">
            <QrCodeImage
              text={requestUrl}
              size={74}
              label="QR code for the guest song request form"
            />
          </div>
          <div className="min-w-0">
            <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-ink">
              Guest request QR
            </div>
            <p className="mt-0.5 text-[10px] leading-snug text-muted">
              Guests scan this to open the public song request form. No event or queue data is exposed.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 rounded border border-alert/60 bg-alert/20 px-2 py-1.5 text-[10px] text-alert-soft" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-2 text-[10px] text-emerald-300" aria-live="polite">
          {notice}
        </p>
      ) : null}

      {loading && requests.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted">Loading guest requests…</p>
      ) : pending.length === 0 ? (
        <p className="mt-3 rounded border border-line bg-page/70 px-2.5 py-2 text-[11px] text-muted">
          No pending guest requests.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pending.map((request) => {
            const busy = updatingId === request.id;
            return (
              <li key={request.id} className="rounded-lg border border-line bg-page/70 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-heading text-sm font-semibold text-ink">
                      {request.song}
                    </div>
                    <div className="truncate text-[11px] text-muted">{request.artist}</div>
                    <RequestTime value={request.createdAt} />
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAccept(request.id)}
                      disabled={busy}
                      className="rounded border border-emerald-700 bg-emerald-950/60 px-2 py-1 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-900/60 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecline(request.id)}
                      disabled={busy}
                      className="rounded border border-alert/60 bg-alert/20 px-2 py-1 text-[10px] font-bold text-alert-soft transition hover:bg-alert/30 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {accepted.length > 0 || declined.length > 0 ? (
        <div className="mt-3 border-t border-line pt-2">
          <h3 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
            Recent outcomes
          </h3>
          <ul className="mt-1 space-y-1 text-[10px]">
            {accepted.slice(0, 5).map((request) => (
              <li key={request.id} className="flex items-center gap-1.5 text-emerald-300">
                <span aria-hidden="true">✓</span>
                <span className="font-bold">Accepted</span>
                <span className="truncate text-muted">
                  {request.song} · {request.artist}
                </span>
              </li>
            ))}
            {declined.slice(0, 5).map((request) => (
              <li key={request.id} className="flex items-center gap-1.5 text-muted">
                <span aria-hidden="true">✕</span>
                <span className="font-bold">Declined</span>
                <span className="truncate">
                  {request.song} · {request.artist}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

// VIP desktop queue. The parent renders it only in the wide DJ layout; Standard
// and pocket never mount it.
export default function DjSongRequestQueue({
  enabled = false,
  role = 'dj',
  accessToken = null,
  roomCode = null,
  variant = 'card',
}) {
  const config = useMemo(() => getSyncConfig(), []);
  const connected = Boolean(
    enabled && canModerateSongRequests(role) && config.enabled && accessToken,
  );
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(connected);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const requestUrl = useMemo(() => {
    if (!roomCode) return null;
    return buildSongRequestUrl({
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      baseUrl: import.meta.env.BASE_URL,
      roomCode,
    });
  }, [roomCode]);

  const load = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setError('');
    const result = await fetchSongRequests({ config, accessToken });
    if (result.ok) {
      setRequests(result.requests);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [accessToken, config, connected]);

  useEffect(() => {
    if (!connected) return undefined;
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [connected, load]);

  const update = async (id, status) => {
    if (updatingId) return;
    setUpdatingId(id);
    setError('');
    const result = await updateSongRequestStatus({ config, accessToken, id, status });
    setUpdatingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, status } : request)),
    );
    setNotice(status === 'accepted' ? 'Request accepted.' : 'Request declined.');
    window.setTimeout(() => setNotice(''), 2500);
  };

  if (!enabled || !canModerateSongRequests(role)) return null;

  const { pending } = partitionSongRequests(requests);

  if (variant === 'bar') {
    if (!connected) {
      return (
        <section
          aria-label="Guest song requests"
          className="border-b border-line bg-card px-4 py-1.5 text-[10px] text-muted"
        >
          💬 Guest requests ·{' '}
          {!config.enabled
            ? 'cloud requests are not configured on this deployment.'
            : 'connect in production with a DJ or MC PIN to load requests.'}
        </section>
      );
    }

    return (
      <section
        aria-label="Guest song requests"
        className="border-b border-line bg-card px-4 py-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
            💬 Guest requests
          </span>
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink">
            {pending.length} pending
          </span>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {pending.length === 0 ? (
              <span className="text-[10px] text-muted">
                {loading ? 'Loading guest requests…' : 'No pending guest requests.'}
              </span>
            ) : (
              pending.slice(0, 4).map((request) => (
                <div
                  key={request.id}
                  className="flex min-w-0 items-center gap-1.5 rounded border border-line bg-page/70 px-2 py-1"
                >
                  <span className="max-w-[16rem] truncate text-[11px] text-ink">
                    <strong className="font-semibold text-ink">{request.song}</strong>
                    <span className="text-muted"> · {request.artist}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => update(request.id, 'accepted')}
                    disabled={updatingId === request.id}
                    aria-label={`Accept ${request.song}`}
                    className="rounded border border-emerald-700 bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200 disabled:opacity-50"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => update(request.id, 'declined')}
                    disabled={updatingId === request.id}
                    aria-label={`Decline ${request.song}`}
                    className="rounded border border-alert/60 bg-alert/20 px-1.5 py-0.5 text-[10px] font-bold text-alert-soft disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
            {pending.length > 4 ? (
              <span className="font-mono text-[10px] text-muted">
                +{pending.length - 4} more
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded border border-line-strong bg-raised px-2 py-1 text-[10px] font-semibold text-ink disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>

          {requestUrl ? (
            <details className="relative">
              <summary className="cursor-pointer rounded border border-line-strong bg-raised px-2 py-1 text-[10px] font-semibold text-ink">
                Guest QR
              </summary>
              <div className="absolute right-0 top-full z-raised mt-1 rounded-lg bg-white p-2 shadow-2xl">
                <QrCodeImage
                  text={requestUrl}
                  size={160}
                  label="QR code for the guest song request form"
                />
              </div>
            </details>
          ) : null}
        </div>

        {error ? (
          <p className="mt-1 text-[10px] text-alert-soft" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-1 text-[10px] text-emerald-300" aria-live="polite">
            {notice}
          </p>
        ) : null}
      </section>
    );
  }

  if (!connected) {
    return (
      <section className="rounded-xl border border-line bg-card/95 p-4 shadow-lg">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
          💬 Guest requests
        </h2>
        <p className="mt-1 text-[10px] leading-snug text-muted">
          {!config.enabled
            ? 'Cloud requests are not configured on this deployment.'
            : 'The request queue connects after joining in production with a DJ or MC PIN.'}
        </p>
      </section>
    );
  }

  return (
    <SongRequestQueueList
      requests={requests}
      loading={loading}
      error={error}
      notice={notice}
      updatingId={updatingId}
      requestUrl={requestUrl}
      onAccept={(id) => update(id, 'accepted')}
      onDecline={(id) => update(id, 'declined')}
      onRefresh={load}
    />
  );
}
