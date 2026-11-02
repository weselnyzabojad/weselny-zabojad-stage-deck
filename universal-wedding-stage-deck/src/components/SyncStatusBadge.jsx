const SYNC_STATUS_STYLES = {
  disabled: { label: 'Local only', dot: 'bg-slate-500', chip: 'bg-[#111d3b] border-[#2b3d73] text-slate-300' },
  connecting: { label: 'Connecting…', dot: 'bg-amber-400 animate-pulse', chip: 'bg-amber-950/60 border-amber-800 text-amber-200' },
  connected: { label: 'Cloud synced', dot: 'bg-emerald-400', chip: 'bg-emerald-950/60 border-emerald-800 text-emerald-200' },
  disconnected: { label: 'Disconnected', dot: 'bg-amber-500', chip: 'bg-amber-950/60 border-amber-800 text-amber-200' },
  offline: { label: 'Offline', dot: 'bg-slate-400', chip: 'bg-slate-900 border-slate-700 text-slate-300' },
  error: { label: 'Sync error', dot: 'bg-[#ED2939]', chip: 'bg-[#ED2939]/20 border-[#ED2939]/60 text-[#ff8a93]' },
};

export default function SyncStatusBadge({ status, error, remoteUpdatedAt }) {
  const meta = SYNC_STATUS_STYLES[status] ?? SYNC_STATUS_STYLES.disabled;
  const title = error
    ? `Cloud sync: ${error}`
    : remoteUpdatedAt
      ? `Last remote update: ${new Date(remoteUpdatedAt).toLocaleTimeString()}`
      : 'Cloud sync status';

  return (
    <span title={title} className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs border ${meta.chip}`}>
      <span className={`flex h-2 w-2 rounded-full ${meta.dot}`} />
      <span>{meta.label}</span>
    </span>
  );
}
