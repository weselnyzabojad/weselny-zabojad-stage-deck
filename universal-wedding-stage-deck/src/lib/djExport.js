import {
  getImportantSongs,
  momentMeta,
  sourceLabel,
  sourceStatus,
  sortImportantSongs,
} from './importantSongs.js';
import { coupleDisplayName } from './coupleIdentity.js';

function cutoffLabel(dj) {
  return dj?.cutoff ? String(dj.cutoff) : '';
}

export function buildSetListRows(timeline = []) {
  return timeline.map((entry) => ({
    start: entry.projectedStart ?? '',
    end: entry.projectedEnd ?? '',
    step: entry.step?.title ?? '',
    type: (entry.step?.type ?? '').replaceAll('_', ' '),
    location: entry.step?.location ?? '',
    track: entry.step?.dj?.track ?? '',
    playlist: entry.step?.dj?.playlist ?? '',
    cutoff: cutoffLabel(entry.step?.dj),
  }));
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildSetListCsv(timeline = []) {
  const rows = buildSetListRows(timeline);
  const header = ['Start', 'End', 'Step', 'Type', 'Location', 'Track', 'Playlist', 'Cutoff'];
  return [
    header.join(','),
    ...rows.map((row) =>
      [
        row.start,
        row.end,
        row.step,
        row.type,
        row.location,
        row.track,
        row.playlist,
        row.cutoff,
      ]
        .map(csvCell)
        .join(','),
    ),
  ].join('\r\n');
}

export function buildSourceChecklist(wedding) {
  return sortImportantSongs(getImportantSongs(wedding)).map((song) => ({
    id: song.id,
    title: typeof song.title === 'string' && song.title.trim() ? song.title : 'Title TBC',
    artist: typeof song.artist === 'string' && song.artist.trim() ? song.artist : 'Artist TBC',
    moment: momentMeta(song.moment).label,
    primary: song.source ? sourceLabel(song.source) : 'No source',
    primaryStatus: sourceStatus(song.source),
    backup: song.backupSource ? sourceLabel(song.backupSource) : null,
    backupStatus: song.backupSource ? sourceStatus(song.backupSource) : null,
  }));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildCueSheetHtml({ wedding, timeline = [], generatedAt = new Date() } = {}) {
  const rows = buildSetListRows(timeline);
  const checklist = buildSourceChecklist(wedding);
  const couple = coupleDisplayName(wedding) || wedding?.weddingId || 'Wedding';
  const date = wedding?.date || '';
  const generated = generatedAt instanceof Date ? generatedAt.toISOString() : String(generatedAt);

  const timelineRows = timeline
    .map((_entry, index) => {
      const row = rows[index];
      return `<tr>
        <td>${escapeHtml(row.start)}–${escapeHtml(row.end)}</td>
        <td><strong>${escapeHtml(row.step)}</strong><br><small>${escapeHtml(row.location)}</small></td>
        <td>${escapeHtml(row.track)}</td>
        <td>${escapeHtml(row.playlist)}</td>
        <td>${escapeHtml(row.cutoff)}</td>
      </tr>`;
    })
    .join('');

  const checklistRows = checklist
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.moment)}</td>
        <td><strong>${escapeHtml(item.title)}</strong><br><small>${escapeHtml(item.artist)}</small></td>
        <td>${escapeHtml(item.primary)}<br><small>${escapeHtml(item.primaryStatus)}</small></td>
        <td>${item.backup ? `${escapeHtml(item.backup)}<br><small>${escapeHtml(item.backupStatus)}</small>` : '—'}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>DJ cue sheet — ${escapeHtml(couple)}</title>
  <style>
    :root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; }
    body { margin: 24px; color: #111; }
    h1 { margin: 0 0 4px; font-size: 24px; }
    h2 { margin: 24px 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.08em; }
    p { margin: 2px 0; color: #555; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #bbb; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { background: #eee; }
    small { color: #666; }
    .note { margin-top: 18px; border-top: 1px solid #bbb; padding-top: 8px; font-size: 10px; color: #666; }
    @media print { body { margin: 10mm; } }
  </style>
</head>
<body>
  <h1>DJ cue sheet — ${escapeHtml(couple)}</h1>
  <p>${escapeHtml(date)} · Planned set only · No played-song reporting</p>
  <p>Generated ${escapeHtml(generated)}</p>

  <h2>Planned timeline</h2>
  <table>
    <thead>
      <tr><th>Time</th><th>Step</th><th>Track</th><th>Playlist</th><th>Cutoff</th></tr>
    </thead>
    <tbody>${timelineRows || '<tr><td colspan="5">No planned steps.</td></tr>'}</tbody>
  </table>

  <h2>Source &amp; backup checklist</h2>
  <table>
    <thead><tr><th>Moment</th><th>Song</th><th>Primary source</th><th>Backup source</th></tr></thead>
    <tbody>${checklistRows || '<tr><td colspan="4">No key songs.</td></tr>'}</tbody>
  </table>

  <p class="note">VIP export · planned cartridge data only · verify every missing or unavailable source before the event.</p>
</body>
</html>`;
}

export function cueSheetFilename(wedding) {
  const base = String(wedding?.weddingId || 'dj-cue-sheet').replaceAll(/[^a-z0-9_-]+/gi, '-');
  return `${base}-cue-sheet.html`;
}

export function setListFilename(wedding) {
  const base = String(wedding?.weddingId || 'dj-set-list').replaceAll(/[^a-z0-9_-]+/gi, '-');
  return `${base}-set-list.csv`;
}
