import { useCallback, useEffect, useMemo, useState } from 'react';
import ModalShell from './ModalShell';
import QrCodeImage from './QrCodeImage';
import { getSyncConfig } from '../lib/sync/syncConfig.js';
import { buildSongRequestUrl } from '../lib/songRequests.js';
import { useI18n } from '../i18n/useI18n.js';
import {
  canModerateSongRequests,
  fetchSongRequests,
  markSongRequestPlayed,
  partitionSongRequests,
  subscribeSongRequestChanges,
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
  onPlayed = () => {},
  onRefresh = () => {},
}) {
  const { t } = useI18n();
  const { pending, accepted } = partitionSongRequests(requests);
  const upNext = accepted.filter((request) => !request.playedAt);

  return (
    <section className="rounded-xl border border-brand-strong/50 bg-card/95 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-brand-soft">
            💬 {t('dj.requests.title')}
          </h2>
          <p className="mt-0.5 text-[10px] text-muted">
            {t('dj.requests.pendingCount', { count: pending.length })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand-tint">
            {t('dj.requests.vipDesktop')}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded border border-line-strong bg-raised px-2 py-0.5 text-[10px] font-semibold text-ink transition hover:bg-line disabled:opacity-50"
          >
            {loading ? t('dj.requests.loading') : t('dj.requests.refresh')}
          </button>
        </div>
      </div>

      {requestUrl ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-line bg-page/70 p-2.5">
          <div className="rounded bg-white p-1">
            <QrCodeImage
              text={requestUrl}
              size={74}
              label={t('dj.requests.qrLabel')}
            />
          </div>
          <div className="min-w-0">
            <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-ink">
              {t('dj.requests.qrTitle')}
            </div>
            <p className="mt-0.5 text-[10px] leading-snug text-muted">
              {t('dj.requests.qrBody')}
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

      <h3 className="mt-3 font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
        {t('dj.requests.pendingHeading')}
      </h3>
      {loading && requests.length === 0 ? (
        <p className="mt-1 text-[11px] text-muted">{t('dj.requests.loadingHint')}</p>
      ) : pending.length === 0 ? (
        <p className="mt-1 rounded border border-line bg-page/70 px-2.5 py-2 text-[11px] text-muted">
          {t('dj.requests.noPending')}
        </p>
      ) : (
        <ul className="mt-1 space-y-2">
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
                      aria-label={t('dj.requests.acceptAria', { song: request.song })}
                      className="rounded border border-emerald-700 bg-emerald-950/60 px-2 py-1 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-900/60 disabled:opacity-50"
                    >
                      {t('dj.requests.accept')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecline(request.id)}
                      disabled={busy}
                      aria-label={t('dj.requests.denyAria', { song: request.song })}
                      className="rounded border border-alert/60 bg-alert/20 px-2 py-1 text-[10px] font-bold text-alert-soft transition hover:bg-alert/30 disabled:opacity-50"
                    >
                      {t('dj.requests.deny')}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="mt-3 font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
        {t('dj.requests.acceptedHeading')}
      </h3>
      {upNext.length === 0 ? (
        <p className="mt-1 rounded border border-line bg-page/70 px-2.5 py-2 text-[11px] text-muted">
          {t('dj.requests.noAccepted')}
        </p>
      ) : (
        <ul className="mt-1 space-y-2">
          {upNext.map((request) => {
            const busy = updatingId === request.id;
            return (
              <li key={request.id} className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-heading text-sm font-semibold text-ink">
                      {request.song}
                    </div>
                    <div className="truncate text-[11px] text-muted">{request.artist}</div>
                    <RequestTime value={request.createdAt} />
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlayed(request.id)}
                    disabled={busy}
                    aria-label={t('dj.requests.playedAria', { song: request.song })}
                    className="shrink-0 rounded border border-brand-strong bg-brand/30 px-2 py-1 text-[10px] font-bold text-brand-tint transition hover:bg-brand/50 disabled:opacity-50"
                  >
                    {t('dj.requests.played')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
  const { t } = useI18n();
  const connected = Boolean(
    enabled && canModerateSongRequests(role) && config.enabled && accessToken,
  );
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(connected);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
    const unsubscribe = subscribeSongRequestChanges({
      config,
      accessToken,
      channelName: `song-requests:${roomCode ?? 'room'}`,
      onChange: load,
    });
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [accessToken, config, connected, load, roomCode]);

  const update = async (id, status) => {
    if (updatingId) return;
    const snapshot = requests;
    setUpdatingId(id);
    setError('');
    setNotice('');
    // Optimistic move/removal; denied rows disappear immediately.
    setRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, status } : request)),
    );
    const result = await updateSongRequestStatus({ config, accessToken, id, status });
    setUpdatingId(null);
    if (!result.ok) {
      setRequests(snapshot);
      setError(result.error || t('dj.requests.error'));
      return;
    }
    setNotice(
      status === 'accepted' ? t('dj.requests.acceptedNotice') : t('dj.requests.declinedNotice'),
    );
    window.setTimeout(() => setNotice(''), 2500);
    load();
  };

  const markPlayed = async (id) => {
    if (updatingId) return;
    const snapshot = requests;
    setUpdatingId(id);
    setError('');
    setNotice('');
    // Optimistically remove from up-next; played_at keeps the DB history.
    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, playedAt: new Date().toISOString() } : request,
      ),
    );
    const result = await markSongRequestPlayed({ config, accessToken, id });
    setUpdatingId(null);
    if (!result.ok) {
      setRequests(snapshot);
      setError(result.error || t('dj.requests.error'));
      return;
    }
    setNotice(t('dj.requests.playedNotice'));
    window.setTimeout(() => setNotice(''), 2500);
    load();
  };

  if (!enabled || !canModerateSongRequests(role)) return null;

  const { pending, accepted } = partitionSongRequests(requests);
  const upNext = accepted.filter((request) => !request.playedAt);

  const qrButton = (
    <button
      type="button"
      onClick={() => setQrOpen(true)}
      disabled={!requestUrl}
      title={requestUrl ? t('dj.requests.qrButton') : t('dj.requests.qrUnavailable')}
      aria-label={requestUrl ? t('dj.requests.qrButton') : t('dj.requests.qrUnavailable')}
      className="inline-flex min-h-11 items-center rounded border border-line-strong bg-raised px-2.5 py-1 text-[10px] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
    >
      {t('dj.requests.qrButton')}
    </button>
  );

  const qrDialog = (
    <ModalShell
      open={qrOpen}
      onClose={() => setQrOpen(false)}
      labelledBy="song-request-qr-title"
      size="full"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-16 text-center">
        <h2 id="song-request-qr-title" className="font-heading text-xl font-bold text-ink">
          {t('dj.requests.qrButton')}
        </h2>
        <p className="max-w-md text-sm text-muted">{t('dj.requests.qrDialogBody')}</p>
        {requestUrl ? (
          <div
            className="shrink-0 overflow-hidden rounded-xl bg-white p-2 shadow-2xl"
            style={{ width: 'min(80vmin, 80dvh)', height: 'min(80vmin, 80dvh)' }}
          >
            <QrCodeImage
              text={requestUrl}
              size={720}
              fill
              label={t('dj.requests.qrLabel')}
            />
          </div>
        ) : null}
        <div className="w-full max-w-xl break-all rounded-lg border border-line bg-raised px-3 py-2 font-mono text-[11px] text-ink">
          {requestUrl ?? t('dj.requests.qrUnavailable')}
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(requestUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
          disabled={!requestUrl}
          className="rounded border border-line-strong bg-raised px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50"
        >
          {copied ? t('dj.requests.qrCopied') : t('dj.requests.qrCopy')}
        </button>
      </div>
    </ModalShell>
  );

  if (variant === 'bar') {
    if (!connected) {
      return (
        <section
          aria-label={t('dj.requests.title')}
          className="flex flex-wrap items-center gap-2 border-b border-line bg-card px-4 py-1.5 text-[10px] text-muted"
        >
          <span>💬 {t('dj.requests.title')} ·{' '}
            {!config.enabled ? t('dj.requests.notConfigured') : t('dj.requests.offline')}
          </span>
          {qrButton}
          {qrDialog}
        </section>
      );
    }

    return (
      <section
        aria-label={t('dj.requests.title')}
        className="border-b border-line bg-card px-4 py-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
            💬 {t('dj.requests.title')}
          </span>
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink">
            {t('dj.requests.pendingCount', { count: pending.length })}
          </span>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {pending.length === 0 ? (
              <span className="text-[10px] text-muted">
                {loading ? t('dj.requests.loadingHint') : t('dj.requests.noPending')}
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
                    aria-label={t('dj.requests.acceptAria', { song: request.song })}
                    className="rounded border border-emerald-700 bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200 disabled:opacity-50"
                  >
                    {t('dj.requests.accept')}
                  </button>
                  <button
                    type="button"
                    onClick={() => update(request.id, 'declined')}
                    disabled={updatingId === request.id}
                    aria-label={t('dj.requests.denyAria', { song: request.song })}
                    className="rounded border border-alert/60 bg-alert/20 px-1.5 py-0.5 text-[10px] font-bold text-alert-soft disabled:opacity-50"
                  >
                    {t('dj.requests.deny')}
                  </button>
                </div>
              ))
            )}
            {pending.length > 4 ? (
              <span className="font-mono text-[10px] text-muted">
                +{pending.length - 4}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded border border-line-strong bg-raised px-2 py-1 text-[10px] font-semibold text-ink disabled:opacity-50"
          >
            {loading ? t('dj.requests.loading') : t('dj.requests.refresh')}
          </button>

          {qrButton}
          {qrDialog}
        </div>

        {upNext.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-1.5">
            <span className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
              {t('dj.requests.acceptedHeading')}
            </span>
            {upNext.slice(0, 4).map((request) => (
              <div
                key={request.id}
                className="flex min-w-0 items-center gap-1.5 rounded border border-emerald-900/60 bg-emerald-950/30 px-2 py-1"
              >
                <span className="max-w-[16rem] truncate text-[11px] text-ink">
                  <strong className="font-semibold text-ink">{request.song}</strong>
                  <span className="text-muted"> · {request.artist}</span>
                </span>
                <button
                  type="button"
                  onClick={() => markPlayed(request.id)}
                  disabled={updatingId === request.id}
                  aria-label={t('dj.requests.playedAria', { song: request.song })}
                  className="rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 text-[10px] font-bold text-brand-tint disabled:opacity-50"
                >
                  {t('dj.requests.played')}
                </button>
              </div>
            ))}
            {upNext.length > 4 ? (
              <span className="font-mono text-[10px] text-muted">+{upNext.length - 4}</span>
            ) : null}
          </div>
        ) : null}

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
          💬 {t('dj.requests.title')}
        </h2>
        <p className="mt-1 text-[10px] leading-snug text-muted">
          {!config.enabled ? t('dj.requests.notConfigured') : t('dj.requests.offline')}
        </p>
        <div className="mt-2">{qrButton}</div>
        {qrDialog}
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
      onPlayed={markPlayed}
      onRefresh={load}
    />
  );
}
