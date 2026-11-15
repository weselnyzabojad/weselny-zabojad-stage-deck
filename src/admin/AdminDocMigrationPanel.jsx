import { useState } from 'react';
import { migrateDocs, preflightDocMigration } from './adminApi';

const EMPTY_COUNTS = { total: 0, ready: 0, alreadyMigrated: 0, conflicts: 0 };

const STATUS_LABEL = {
  ready: 'move + rename',
  move: 'move',
  rename: 'rename',
  'already-migrated': 'already migrated',
  'target-conflict': 'CONFLICT · left untouched',
  'missing-file-id': 'no Doc id · left untouched',
  'missing-file': 'missing/unresolvable · left untouched',
  'missing-wedding-folder': 'wedding folder missing · left untouched',
  'wrong-folder': 'outside the wedding Drive tree · left untouched',
  'invalid-wedding-id': 'wedding id is not UM format · left untouched',
  'invalid-record': 'invalid record · left untouched',
  migrated: 'migrated',
  failed: 'failed · retry',
};

function statusLabel(status) {
  return STATUS_LABEL[status] ?? status;
}

function statusTone(status) {
  if (status === 'target-conflict' || status === 'failed') return 'text-alert-soft';
  if (status === 'already-migrated' || status === 'migrated') return 'text-emerald-300';
  if (status?.includes('missing') || status === 'wrong-folder' || status === 'invalid-wedding-id') {
    return 'text-amber-200';
  }
  return 'text-muted';
}

export default function AdminDocMigrationPanel({ wedding, readOnly = false, onChanged }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [plan, setPlan] = useState(null);

  const disabled = readOnly || Boolean(wedding.archived_at);
  const counts = plan?.counts ?? EMPTY_COUNTS;
  const entries = plan?.entries ?? [];
  const canMigrate = !disabled && plan?.weddingIdValid !== false && counts.ready > 0;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await preflightDocMigration(
        wedding.wedding_id,
        wedding.drive_folder_id ?? wedding.driveFolderId ?? '',
      );
      setPlan(result);
    } catch (cause) {
      setError(cause?.message ?? 'Could not preflight the Drive Doc migration.');
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (disabled || !canMigrate) return;
    if (
      !window.confirm(
        `Move/rename ${counts.ready} Drive Doc${counts.ready === 1 ? '' : 's'} to the UM paths? ` +
          'Docs are moved and renamed only; no Doc is deleted, overwritten or content-modified. Conflicts and missing files are left untouched.',
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await migrateDocs({
        weddingId: wedding.wedding_id,
        weddingFolderId: wedding.drive_folder_id ?? wedding.driveFolderId ?? '',
        confirmed: true,
      });
      const summary = result?.summary ?? {};
      setMessage(
        `Doc migration: ${summary.migrated ?? 0} migrated, ${summary.renamed ?? 0} renamed, ` +
          `${summary.moved ?? 0} moved, ${summary.skipped ?? 0} skipped, ` +
          `${summary.conflicts ?? 0} conflicts, ${summary.failed ?? 0} failed.`,
      );
      setPlan(result);
      onChanged?.();
    } catch (cause) {
      setError(cause?.message ?? 'Could not migrate the Drive Docs.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 rounded border border-line bg-raised/40">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load();
        }}
        className="flex w-full items-center justify-between px-2 py-1.5 text-left font-heading text-[10px] font-semibold uppercase tracking-widest text-muted"
      >
        <span>Drive Doc migration · UM paths</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-line p-2 text-[10px]">
          <p className="rounded border border-line bg-card p-2 text-muted">
            Moves existing speech, Test Wiedzy and Test Zgodności Docs to their UM paths. Google
            Docs are never deleted, overwritten or content-modified; conflicts stop that Doc and
            reruns are safe. The customer-visible wedding folder keeps only{' '}
            <span className="font-mono">games/</span>; private Docs stay under{' '}
            <span className="font-mono">secrets/{wedding.wedding_id}/</span>.
          </p>

          {loading ? <p className="text-muted">Reading Drive metadata…</p> : null}

          {plan ? (
            <>
              {plan.weddingIdValid === false ? (
                <p role="alert" className="rounded border border-alert/60 bg-alert/15 p-2 font-semibold text-alert-soft">
                  Wedding id is not in the UM format. Correct it before migrating Docs; every
                  Doc stays untouched.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-muted">
                <span>{counts.total} Docs</span>
                <span>· {counts.ready} ready</span>
                <span>· {counts.alreadyMigrated} already migrated</span>
                <span>· {counts.conflicts} conflicts</span>
                <span>· {counts.missingFiles} missing</span>
                <span>· {counts.wrongFolders} wrong folder</span>
              </div>

              {entries.length === 0 ? (
                <p className="rounded border border-line bg-page/60 p-2 text-muted">
                  No existing speech or game question Docs to migrate.
                </p>
              ) : (
                <ul className="space-y-1">
                  {entries.map((entry) => (
                    <li
                      key={`${entry.kind}-${entry.id}`}
                      className="rounded border border-line bg-page/60 p-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-mono text-[9px] font-bold uppercase text-ink">
                          {entry.kind === 'speech' ? 'Speech' : entry.gameType} · {entry.fileId || 'no Doc id'}
                        </span>
                        <span className={`font-mono text-[9px] ${statusTone(entry.status)}`}>
                          {statusLabel(entry.status)}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[9px] text-muted">
                        Current · {entry.current?.name || '—'} ·{' '}
                        {entry.current?.folderPath?.length
                          ? [...(plan.rootPath ?? []), ...entry.current.folderPath].join(' / ')
                          : entry.current?.folderId || 'unknown folder'}
                      </p>
                      <p className="font-mono text-[9px] text-muted">
                        Target · {entry.target?.folderPath || '—'} / {entry.target?.name || '—'}
                      </p>
                      {entry.code && !['ready', 'move', 'rename', 'already-migrated', 'migrated'].includes(entry.code) ? (
                        <p className={`mt-1 font-mono text-[9px] ${statusTone(entry.status)}`}>
                          {entry.code}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => void runMigration()}
                disabled={busy || !canMigrate}
                className="rounded border border-amber-600 bg-amber-900/60 px-2 py-1 font-semibold text-amber-100 disabled:opacity-40"
              >
                {busy ? 'Migrating…' : 'Migrate Docs to UM paths'}
              </button>
            </>
          ) : null}

          {message ? <p className="text-emerald-300">{message}</p> : null}
          {error ? (
            <pre className="whitespace-pre-wrap rounded bg-alert/10 p-2 text-alert-soft">
              {error}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
