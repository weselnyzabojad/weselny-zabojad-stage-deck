export function timelineSyncStatus({
  templateDocId = null,
  syncedRevision = null,
  currentRevision = 0,
} = {}) {
  if (!templateDocId) return 'unlinked';
  if (Number.isInteger(syncedRevision) && syncedRevision === currentRevision) return 'synced';
  return 'pending';
}

export function timelineDocUrl(templateDocId) {
  return templateDocId ? `https://docs.google.com/document/d/${templateDocId}/edit` : null;
}

export function buildTimelineContext(row = {}) {
  const currentRevision = Number(row.cartridge_revision ?? 0);
  const syncedRevision = Number.isInteger(row.timeline_doc_synced_revision)
    ? row.timeline_doc_synced_revision
    : null;
  const templateDocId = row.template_doc_id ?? null;
  return {
    weddingId: row.wedding_id,
    couple: row.couple ?? null,
    date: row.date ?? null,
    cartridge: row.cartridge ?? null,
    cartridgeRevision: currentRevision,
    templateDocId,
    docUrl: timelineDocUrl(templateDocId),
    syncedRevision,
    syncedAt: row.timeline_doc_synced_at ?? null,
    status: timelineSyncStatus({
      templateDocId,
      syncedRevision,
      currentRevision,
    }),
  };
}
