import { useEffect, useRef, useState } from 'react';
import QrCodeImage from './QrCodeImage';
import {
  formatCueSeconds,
  isCustomerFile,
  isStreamingSource,
  isVipTier,
  momentMeta,
  qrTarget,
  songCues,
  songLink,
  songState,
  songStatus,
  sortImportantSongs,
  sourceLabel,
} from '../lib/importantSongs';

const STATE_CHIPS = {
  done: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  active: 'border-brand-strong bg-brand/40 text-brand-tint animate-pulse',
  next: 'border-amber-800 bg-amber-950/60 text-amber-200',
  planned: 'border-line-strong bg-raised text-muted',
};

const STATE_LABELS = {
  done: 'DONE',
  active: 'ON AIR',
  next: 'NEXT',
  planned: 'PLANNED',
};

const SOURCE_STATUS = {
  ready: { label: 'READY', className: 'border-emerald-800 bg-emerald-950/60 text-emerald-300' },
  backup: { label: 'USE BACKUP', className: 'border-amber-800 bg-amber-950/60 text-amber-200' },
  missing: { label: 'NO SOURCE', className: 'border-amber-800 bg-amber-950/60 text-amber-200' },
  unavailable: { label: 'UNAVAILABLE', className: 'border-alert/60 bg-alert/20 text-alert-soft' },
};

const SOURCE_WARNINGS = {
  backup: 'Primary source is not usable — switch to the backup.',
  missing: 'No source stored yet — add one in the cartridge.',
  unavailable: 'Source is unavailable — check the link or file.',
};

async function writeClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(area);
  return copied;
}

function ActionLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-semibold text-ink transition hover:bg-line"
    >
      {children}
    </a>
  );
}

function ActionButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-semibold text-ink transition hover:bg-line"
    >
      {children}
    </button>
  );
}

function formatChecksum(checksum) {
  if (typeof checksum !== 'string' || !checksum) return null;
  return checksum.length > 18 ? `${checksum.slice(0, 18)}…` : checksum;
}

// One key-song row. VIP renders the full source/root, cues, backup and mini QR;
// Standard renders the title and artist only and never leaks the source.
function SongRow({ song, tier, timeline, activeIndex, onOpenQr, onCopy }) {
  const vip = isVipTier(tier);
  const moment = momentMeta(song.moment);
  const state = songState(song, timeline, activeIndex);
  const source = song.source;
  const backup = song.backupSource;
  const link = songLink(source);
  const status = songStatus(song);
  const qr = vip ? qrTarget(song) : { unavailable: '' };
  const cues = vip ? songCues(song) : [];
  const streaming = isStreamingSource(source);
  const showBackup = vip && backup && typeof backup === 'object';

  return (
    <li className="rounded-lg border border-line bg-page/70 p-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span aria-hidden="true">{moment.icon}</span>
            <span className="font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
              {moment.label}
            </span>
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${STATE_CHIPS[state]}`}
            >
              {STATE_LABELS[state]}
            </span>
            {vip ? (
              <span
                className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${SOURCE_STATUS[status].className}`}
              >
                {SOURCE_STATUS[status].label}
              </span>
            ) : null}
          </div>

          <div className="mt-1 font-heading text-sm font-semibold leading-tight text-ink">
            {typeof song.title === 'string' && song.title.trim() ? song.title : 'Title TBC'}
          </div>
          <div className="text-[11px] text-ink">
            {typeof song.artist === 'string' && song.artist.trim() ? song.artist : 'Artist TBC'}
            {vip && song.version ? <span className="text-muted"> · {song.version}</span> : null}
          </div>

          {vip ? (
            <div className="mt-2 space-y-1.5 text-[10px] text-muted">
              <div className="flex flex-wrap items-center gap-1.5">
                {song.plannedTime ? (
                  <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-ink">
                    ⏱ {song.plannedTime}
                  </span>
                ) : null}
                {cues.map((cue) => (
                  <span
                    key={cue.key}
                    className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-ink"
                  >
                    {cue.label}
                  </span>
                ))}
                <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5">
                  {source ? sourceLabel(source) : 'No source'}
                </span>
              </div>

              {source && isCustomerFile(source) ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-ink" title={source.fileRef || source.filename}>
                    📁 {source.filename || source.fileRef || 'file'}
                  </span>
                  {source.durationSec ? (
                    <span className="font-mono text-muted">
                      ⏲ {formatCueSeconds(source.durationSec)}
                    </span>
                  ) : null}
                  {source.availability ? (
                    <span className="font-mono text-muted">{source.availability}</span>
                  ) : null}
                  {formatChecksum(source.checksum) ? (
                    <span className="font-mono text-muted" title={source.checksum}>
                      {formatChecksum(source.checksum)}
                    </span>
                  ) : null}
                  {source.url ? <ActionLink href={source.url}>Open file</ActionLink> : null}
                  {!source.url && source.fileRef ? (
                    <span className="text-muted">Locate file on the DJ device</span>
                  ) : null}
                  {link ? <ActionButton onClick={() => onCopy(link, 'File link')}>Copy link</ActionButton> : null}
                </div>
              ) : null}

              {source && !isCustomerFile(source) ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {link ? <ActionLink href={link}>Open source</ActionLink> : null}
                  {link ? <ActionButton onClick={() => onCopy(link, 'Link')}>Copy link</ActionButton> : null}
                  {streaming ? (
                    <span className="rounded border border-amber-800 bg-amber-950/60 px-1.5 py-0.5 font-semibold text-amber-200">
                      ⚠ opens online — not playable offline
                    </span>
                  ) : null}
                </div>
              ) : null}

              {showBackup ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-ink">
                    Backup: {sourceLabel(backup)}
                  </span>
                  {songLink(backup) ? <ActionLink href={songLink(backup)}>Open backup</ActionLink> : null}
                  {songLink(backup) ? (
                    <ActionButton onClick={() => onCopy(songLink(backup), 'Backup link')}>Copy</ActionButton>
                  ) : null}
                  {isCustomerFile(backup) && backup.filename ? (
                    <span className="font-mono text-muted">{backup.filename}</span>
                  ) : null}
                </div>
              ) : null}

              {status !== 'ready' ? (
                <p className="rounded border border-amber-800 bg-amber-950/50 px-1.5 py-1 text-amber-200">
                  {SOURCE_WARNINGS[status]}
                </p>
              ) : null}

              {source?.notes ? <p className="text-muted">📝 {source.notes}</p> : null}
              {song.note ? <p className="text-muted">📝 {song.note}</p> : null}
            </div>
          ) : null}
        </div>

        {vip && qr.url ? (
          <button
            type="button"
            onClick={() => onOpenQr(song)}
            title={`Open a large QR to scan ${song.title || 'this song'} on the playback device`}
            className="flex shrink-0 flex-col items-center gap-1 rounded-lg border border-line-strong bg-white/95 p-1 transition hover:border-brand-strong hover:shadow-lg"
          >
            <QrCodeImage text={qr.url} size={60} label={`QR code to open ${song.title || 'key song'}`} />
            <span className="font-heading text-[8px] font-bold uppercase tracking-wide text-[#0b132b]">
              Scan to open
            </span>
            {streaming ? (
              <span className="font-mono text-[7px] uppercase leading-none text-brand">opens online</span>
            ) : null}
          </button>
        ) : null}

        {vip && !qr.url ? (
          <span
            title={qr.unavailable}
            className="w-[72px] shrink-0 rounded border border-line-strong bg-raised px-1.5 py-2 text-center font-mono text-[8px] leading-tight text-muted"
          >
            QR unavailable
            {isCustomerFile(source) ? <span className="block text-muted">protected file</span> : null}
          </span>
        ) : null}
      </div>
    </li>
  );
}

// Large, non-auto-dismissing QR overlay. The DJ scans it from the playback
// device when the screen is more than ~20 cm away; it closes only on an
// explicit Close or Escape.
function QrOverlay({ song, onClose, onCopy }) {
  const moment = momentMeta(song.moment);
  const target = qrTarget(song);
  const link = songLink(song.source);
  const streaming = isStreamingSource(song.source);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!target.url) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="key-song-qr-title"
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 text-center shadow-2xl">
        <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
          {moment.icon} {moment.label} · {sourceLabel(song.source)}
        </div>
        <h2 id="key-song-qr-title" className="mt-1 font-heading text-lg font-bold text-ink">
          {song.title || 'Title TBC'}
        </h2>
        <div className="text-sm text-ink">{song.artist || 'Artist TBC'}</div>

        <div className="mx-auto mt-4 w-fit rounded-xl bg-white p-3">
          <QrCodeImage text={target.url} size={280} label={`Large QR code to open ${song.title || 'key song'}`} />
        </div>

        <p className="mt-3 text-[11px] text-muted">
          {streaming
            ? 'Opens online on the playback device — scan it with the phone or controller.'
            : 'Opens the shared file on the playback device.'}
        </p>

        <div className="mt-4 flex gap-2">
          {link ? (
            <button
              type="button"
              onClick={() => onCopy(link, 'Link')}
              className="flex-1 rounded-lg border border-line-strong bg-raised px-3 py-2 text-xs font-semibold text-ink transition hover:bg-line"
            >
              Copy link
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-brand-strong bg-brand px-3 py-2 text-xs font-bold text-on-accent transition hover:bg-brand-hover"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Pinned Key Songs card for the DJ Booth. Grand entrance, cake and first dance
// are always visible above the projected timeline; the service package decides
// whether the VIP source/root and mini QR are rendered.
export default function KeySongsCard({ songs = [], tier, timeline = [], activeIndex = -1 }) {
  const [qrSong, setQrSong] = useState(null);
  const [copyNotice, setCopyNotice] = useState('');
  const copyTimer = useRef(null);
  const vip = isVipTier(tier);
  const sortedSongs = sortImportantSongs(songs);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const copy = async (text, label) => {
    if (!text) return;
    const copied = await writeClipboard(text);
    setCopyNotice(copied ? `${label || 'Link'} copied to clipboard.` : 'Copy failed — copy manually.');
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyNotice(''), 2500);
  };

  return (
    <section
      aria-labelledby="key-songs-title"
      className="sticky top-0 z-banner rounded-xl border border-alert/40 bg-card p-4 shadow-lg shadow-black/40"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="key-songs-title"
          className="font-heading text-xs font-bold uppercase tracking-widest text-ink"
        >
          🔑 Key songs
        </h2>
        <span
          className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${
            vip
              ? 'border-alert/60 bg-alert/20 text-alert-tint'
              : 'border-line-strong bg-raised text-ink'
          }`}
        >
          {vip ? 'VIP · source + cues + QR' : 'Standard · title + artist'}
        </span>
      </div>

      {sortedSongs.length === 0 ? (
        <p className="mt-2 text-xs text-muted">
          No key songs in this cartridge. Add them under{' '}
          <span className="font-mono text-ink">musicPolicy.importantSongs[]</span>.
        </p>
      ) : (
        <ol className="mt-2.5 space-y-2">
          {sortedSongs.map((song) => (
            <SongRow
              key={song.id}
              song={song}
              tier={tier}
              timeline={timeline}
              activeIndex={activeIndex}
              onOpenQr={setQrSong}
              onCopy={copy}
            />
          ))}
        </ol>
      )}

      <span aria-live="polite" className="sr-only">
        {copyNotice}
      </span>
      {copyNotice ? (
        <p className="mt-2 text-[10px] text-emerald-300">{copyNotice}</p>
      ) : null}

      {qrSong ? (
        <QrOverlay song={qrSong} onClose={() => setQrSong(null)} onCopy={copy} />
      ) : null}
    </section>
  );
}
