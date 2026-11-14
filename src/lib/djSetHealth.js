import {
  getImportantSongs,
  isCustomerFile,
  momentMeta,
  sortImportantSongs,
  sourceLabel,
  sourceStatus,
} from './importantSongs.js';

// Offline Set Health for the DJ VIP surface (issue #145). The calculation is
// deliberately pure and derived from existing cartridge metadata. It never
// reads or exposes URLs, protected file references or MC/private data.

const SOURCE_STATES = {
  cached: { key: 'cached', label: 'Cached locally', offlineReady: true },
  online: { key: 'online', label: 'Online only', offlineReady: false },
  missing: { key: 'missing', label: 'Missing', offlineReady: false },
  unavailable: { key: 'unavailable', label: 'Unavailable', offlineReady: false },
};

export function sourceHealth(source) {
  const status = sourceStatus(source);
  if (status === 'missing') return SOURCE_STATES.missing;
  if (status === 'unavailable') return SOURCE_STATES.unavailable;

  const localFile =
    source?.availability === 'LOCAL' ||
    (isCustomerFile(source) && typeof source?.fileRef === 'string' && source.fileRef.trim() !== '');

  return localFile ? SOURCE_STATES.cached : SOURCE_STATES.online;
}

function effectiveSource(primary, backup) {
  if (primary.offlineReady) return { ...primary, usedBackup: false };
  if (backup?.offlineReady) {
    return { ...SOURCE_STATES.cached, key: 'backup', label: 'Backup cached', usedBackup: true };
  }
  if (backup && backup.key === 'online') {
    return { ...SOURCE_STATES.online, key: 'online', label: 'Backup online only', usedBackup: true };
  }
  return { ...primary, usedBackup: false };
}

export function buildDjSetHealth(wedding, timeline = []) {
  const stepTitles = new Map(
    timeline
      .filter((entry) => entry?.step?.id)
      .map((entry) => [entry.step.id, entry.step.title || entry.step.id]),
  );

  const items = sortImportantSongs(getImportantSongs(wedding)).map((song) => {
    const primary = sourceHealth(song.source);
    const backup = song.backupSource ? sourceHealth(song.backupSource) : null;
    const effective = effectiveSource(primary, backup);

    return {
      id: song.id,
      title: typeof song.title === 'string' && song.title.trim() ? song.title : 'Title TBC',
      artist: typeof song.artist === 'string' && song.artist.trim() ? song.artist : 'Artist TBC',
      moment: momentMeta(song.moment).label,
      stepTitle: song.stepId ? stepTitles.get(song.stepId) ?? null : null,
      primary,
      backup,
      effective,
      primaryLabel: song.source ? sourceLabel(song.source) : 'No source',
      backupLabel: song.backupSource ? sourceLabel(song.backupSource) : null,
      offlineReady: effective.offlineReady,
    };
  });

  const count = (key) => items.filter((item) => item.effective.key === key).length;
  const cached = count('cached');
  const online = count('online');
  const backup = count('backup');
  const missing = count('missing');
  const unavailable = count('unavailable');
  const offlineReady = items.filter((item) => item.offlineReady).length;
  const criticalItems = items.filter(
    (item) => item.effective.key === 'missing' || item.effective.key === 'unavailable',
  );
  const warningItems = items.filter(
    (item) => item.effective.key === 'online' || item.effective.key === 'backup',
  );

  let status = 'ready';
  if (items.length === 0) status = 'empty';
  else if (criticalItems.length > 0) status = 'critical';
  else if (cached !== items.length) status = 'attention';

  return {
    status,
    total: items.length,
    cached,
    online,
    backup,
    missing,
    unavailable,
    offlineReady,
    items,
    criticalItems,
    warningItems,
  };
}
