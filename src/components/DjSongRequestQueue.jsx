import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DiscoPoloBadge from './DiscoPoloBadge';
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

const EXIT_MS = 180;

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function PlayedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 11a8 8 0 1 0-2.3 6.7M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RequestTime({ value, locale }) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return (
    <span className="font-mono text-[10px] text-muted">
      {date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

function RequestCard({ request, leaving, busy, locale, onAccept, onDecline }) {
  const { t } = useI18n();
  return (
    <li
      className={`rounded-xl border border-line bg-card p-3 shadow-sm transition-all duration-200 motion-reduce:transition-none ${
        leaving ? 'opacity-0 -translate-x-4 motion-reduce:translate-x-0' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-sm font-semibold text-ink">{request.song}</div>
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
            <span className="truncate">{request.artist}</span>
            <span aria-hidden="true">·</span>
            <RequestTime value={request.createdAt} locale={locale} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAccept(request.id)}
            disabled={busy || leaving}
            aria-label={t('dj.requests.acceptAria', { song: request.song })}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/50 transition hover:bg-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50"
          >
            <CheckIcon />
          </button>
          <button
            type="button"
            onClick={() => onDecline(request.id)}
            disabled={busy || leaving}
            aria-label={t('dj.requests.denyAria', { song: request.song })}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-alert/40 bg-alert/10 text-alert-soft ring-1 ring-alert/40 transition hover:bg-alert/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alert disabled:opacity-50"
          >
            <CrossIcon />
          </button>
        </div>
      </div>
    </li>
  );
}

function AcceptedCard({ request, leaving, busy, locale, onPlayed }) {
  const { t } = useI18n();
  return (
    <li
      className={`rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 shadow-sm transition-all duration-200 motion-reduce:transition-none ${
        leaving ? 'opacity-0 -translate-x-4 motion-reduce:translate-x-0' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-sm font-semibold text-ink">{request.song}</div>
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
            <span className="truncate">{request.artist}</span>
            <span aria-hidden="true">·</span>
            <RequestTime value={request.createdAt} locale={locale} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onPlayed(request.id)}
          disabled={busy || leaving}
          aria-label={t('dj.requests.playedAria', { song: request.song })}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-strong/60 bg-brand/20 text-brand-soft ring-1 ring-brand-strong/50 transition hover:bg-brand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft disabled:opacity-50"
        >
          <PlayedIcon />
        </button>
      </div>
    </li>
  );
}

// VIP desktop queue. The parent renders it only in the VIP DJ layout; Standard
// and pocket never mount it. The always-visible bar is a summary; moderation
// happens in the panel so the booth view stays free of inline actions.
export default function DjSongRequestQueue({
  enabled = false,
  role = 'dj',
  accessToken = null,
  roomCode = null,
  discoPoloPolicy = 'NO',
  showDiscoPoloBadge = true,
}) {
  const config = useMemo(() => getSyncConfig(), []);
  const { t, locale } = useI18n();
  const connected = Boolean(
    enabled && canModerateSongRequests(role) && config.enabled && accessToken,
  );
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(connected);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [leavingIds, setLeavingIds] = useState(() => new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState('pending');
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const noticeTimerRef = useRef(0);
  const exitTimersRef = useRef(new Set());
  const decidingRef = useRef(new Set());

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
    // eslint-disable-next-line react/set-state-in-effect -- load() sets its loading flag before the external song-request fetch
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

  useEffect(
    () => () => {
      window.clearTimeout(noticeTimerRef.current);
      for (const timer of exitTimersRef.current) window.clearTimeout(timer);
      exitTimersRef.current.clear();
    },
    [],
  );

  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 2500);
  };

  const update = async (id, status) => {
    if (updatingId) return;
    const snapshot = requests;
    setUpdatingId(id);
    setError('');
    setNotice('');
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
    showNotice(
      status === 'accepted' ? t('dj.requests.acceptedNotice') : t('dj.requests.declinedNotice'),
    );
    load();
  };

  const markPlayed = async (id) => {
    if (updatingId) return;
    const snapshot = requests;
    setUpdatingId(id);
    setError('');
    setNotice('');
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
    showNotice(t('dj.requests.playedNotice'));
    load();
  };

  // Let the card slide out before the optimistic status move removes it from
  // the tab. A failed API call restores the snapshot and the card returns.
  const decide = (id, status) => {
    if (updatingId || decidingRef.current.has(id)) return;
    decidingRef.current.add(id);
    setLeavingIds((current) => new Set(current).add(id));
    const timer = window.setTimeout(() => {
      exitTimersRef.current.delete(timer);
      decidingRef.current.delete(id);
      setLeavingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      void update(id, status);
    }, EXIT_MS);
    exitTimersRef.current.add(timer);
  };

  const playAndLeave = (id) => {
    if (updatingId || decidingRef.current.has(id)) return;
    decidingRef.current.add(id);
    setLeavingIds((current) => new Set(current).add(id));
    const timer = window.setTimeout(() => {
      exitTimersRef.current.delete(timer);
      decidingRef.current.delete(id);
      setLeavingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      void markPlayed(id);
    }, EXIT_MS);
    exitTimersRef.current.add(timer);
  };

  if (!enabled || !canModerateSongRequests(role)) return null;

  const { pending, accepted } = partitionSongRequests(requests);
  const upNext = accepted.filter((request) => !request.playedAt);

  const openPanel = () => {
    setQrOpen(false);
    setTab('pending');
    setPanelOpen(true);
  };
  const closePanel = () => setPanelOpen(false);
  const openQr = () => {
    setPanelOpen(false);
    setQrOpen(true);
  };

  const qrButton = (
    <button
      type="button"
      onClick={openQr}
      disabled={!requestUrl}
      title={requestUrl ? t('dj.requests.qrButton') : t('dj.requests.qrUnavailable')}
      aria-label={requestUrl ? t('dj.requests.qrButton') : t('dj.requests.qrUnavailable')}
      className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-raised px-2.5 py-1 text-[10px] font-semibold text-ink transition hover:bg-line disabled:cursor-not-allowed disabled:opacity-50"
    >
      {t('dj.requests.qrButton')}
    </button>
  );

  const refreshButton = (
    <button
      type="button"
      onClick={load}
      disabled={loading}
      aria-label={t('dj.requests.refresh')}
      title={t('dj.requests.refresh')}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line-strong bg-raised text-ink transition hover:bg-line disabled:opacity-50"
    >
      <RefreshIcon />
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

  const tabs = [
    ['pending', t('dj.requests.tabPending', { count: pending.length })],
    ['accepted', t('dj.requests.tabAccepted', { count: upNext.length })],
  ];

  const handleTabKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setTab((current) => (current === 'pending' ? 'accepted' : 'pending'));
  };

  const pendingList =
    pending.length === 0 ? (
      <p className="rounded-lg border border-line bg-raised/60 px-3 py-4 text-center text-[11px] text-muted">
        {loading ? t('dj.requests.loadingHint') : t('dj.requests.noPending')}
      </p>
    ) : (
      <ul className="space-y-2">
        {pending.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            leaving={leavingIds.has(request.id)}
            busy={updatingId === request.id}
            locale={locale}
            onAccept={(id) => decide(id, 'accepted')}
            onDecline={(id) => decide(id, 'declined')}
          />
        ))}
      </ul>
    );

  const acceptedList =
    upNext.length === 0 ? (
      <p className="rounded-lg border border-line bg-raised/60 px-3 py-4 text-center text-[11px] text-muted">
        {t('dj.requests.noAccepted')}
      </p>
    ) : (
      <ul className="space-y-2">
        {upNext.map((request) => (
          <AcceptedCard
            key={request.id}
            request={request}
            leaving={leavingIds.has(request.id)}
            busy={updatingId === request.id}
            locale={locale}
            onPlayed={playAndLeave}
          />
        ))}
      </ul>
    );

  const panel = (
    <ModalShell
      open={panelOpen}
      onClose={closePanel}
      labelledBy="song-request-panel-title"
      size="panel"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-line px-4 pb-2 pr-14 pt-4">
          <h2 id="song-request-panel-title" className="font-heading text-base font-bold text-ink">
            💬 {t('dj.requests.panelTitle')}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {t('dj.requests.pendingCount', { count: pending.length })}
          </p>
        </header>

        <div role="tablist" aria-label={t('dj.requests.panelTitle')} className="shrink-0 border-b border-line px-2">
          {tabs.map(([value, label]) => {
            const selected = tab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                id={`song-request-tab-${value}`}
                aria-selected={selected}
                aria-controls={`song-request-panel-${value}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(value)}
                onKeyDown={handleTabKeyDown}
                className={`min-h-11 px-3 font-heading text-[11px] font-bold uppercase tracking-widest transition ${
                  selected
                    ? 'border-b-2 border-brand-strong text-ink'
                    : 'border-b-2 border-transparent text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mx-4 mt-2 rounded border border-alert/60 bg-alert/20 px-2 py-1.5 text-[10px] text-alert-soft" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mx-4 mt-2 text-[10px] text-emerald-600" aria-live="polite">
            {notice}
          </p>
        ) : null}

        <div
          role="tabpanel"
          id={`song-request-panel-${tab}`}
          aria-labelledby={`song-request-tab-${tab}`}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          {tab === 'pending' ? pendingList : acceptedList}
        </div>
      </div>
    </ModalShell>
  );

  if (!connected) {
    return (
      <section className="border-b border-line bg-card px-4 py-1.5" aria-label={t('dj.requests.title')}>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">
          <span>💬 {t('dj.requests.title')} ·{' '}
            {!config.enabled ? t('dj.requests.notConfigured') : t('dj.requests.offline')}
          </span>
          {showDiscoPoloBadge ? <DiscoPoloBadge value={discoPoloPolicy} compact /> : null}
          {qrButton}
          {qrDialog}
        </div>
      </section>
    );
  }

  return (
    <section aria-label={t('dj.requests.title')} className="border-b border-line bg-card px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
          💬 {t('dj.requests.title')}
        </span>
        <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink">
          {t('dj.requests.pendingCount', { count: pending.length })}
        </span>
        {upNext.length > 0 ? (
          <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600">
            {t('dj.requests.acceptedCount', { count: upNext.length })}
          </span>
        ) : null}
        {showDiscoPoloBadge ? <DiscoPoloBadge value={discoPoloPolicy} compact /> : null}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={openPanel}
            aria-label={t('dj.requests.moderateAria', { count: pending.length })}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-brand-strong/70 bg-brand/15 px-3 py-1 text-[11px] font-bold text-brand-soft transition hover:bg-brand/25"
          >
            {t('dj.requests.moderate')}
          </button>
          {refreshButton}
          {qrButton}
        </div>
      </div>

      {error ? (
        <p className="mt-1 text-[10px] text-alert-soft" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-1 text-[10px] text-emerald-600" aria-live="polite">
          {notice}
        </p>
      ) : null}

      {panel}
      {qrDialog}
    </section>
  );
}
