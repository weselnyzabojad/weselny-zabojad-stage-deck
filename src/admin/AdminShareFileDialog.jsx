import { useEffect, useRef, useState } from 'react';
import { listDrivePermissions, revokeDrivePermission, shareDriveFile } from './adminApi';
import {
  isOwnerPermission,
  permissionLabel,
  shareErrorMessage,
  validateShareEmail,
} from './adminSharing';

// Admin-only reader sharing for a single private file (issue #981). It only
// calls the admin_drive proxy; the browser never talks to Google.
export default function AdminShareFileDialog({ file, readOnly = false, onClose }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [pendingRemove, setPendingRemove] = useState('');
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function loadPermissions() {
    setLoading(true);
    setError('');
    try {
      const result = await listDrivePermissions(file.id);
      setPermissions(Array.isArray(result?.permissions) ? result.permissions : []);
    } catch (cause) {
      setError(shareErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- loadPermissions sets its loading flag before the external admin_api call
    void loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- file.id is the only identity that should reload permissions; loadPermissions is recreated per render
  }, [file.id]);

  async function submit(event) {
    event.preventDefault();
    setNotice('');
    setError('');
    if (!validateShareEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    setBusy(true);
    try {
      const result = await shareDriveFile({
        fileId: file.id,
        email: email.trim(),
        notify,
        message: message.trim(),
      });
      setNotice(result?.existing ? 'That reader already has access.' : 'Reader added.');
      setEmail('');
      setMessage('');
      await loadPermissions();
    } catch (cause) {
      setError(shareErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removePermission(permission) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await revokeDrivePermission({ fileId: file.id, permissionId: permission.id });
      setNotice('Access removed.');
      setPendingRemove('');
      await loadPermissions();
    } catch (cause) {
      setError(shareErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-banner flex items-start justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-file-title"
        aria-describedby="share-file-warning"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            close();
          }
        }}
        className="mt-16 w-full max-w-lg rounded-xl border border-line bg-card p-4 text-xs text-ink shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              id="share-file-title"
              ref={headingRef}
              tabIndex={-1}
              className="font-heading text-sm font-bold text-ink"
            >
              Share private file
            </h3>
            <p className="mt-1 break-all font-mono text-[11px] text-muted">{file.name}</p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="rounded border border-line px-2 py-0.5 text-[11px] text-muted disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <p id="share-file-warning" className="mt-2 rounded border border-amber-700 bg-amber-950/50 px-2 py-1.5 text-[11px] text-amber-200">
          Speech scripts and game questions are private. Recipients get read-only access to this
          file only.
        </p>

        {readOnly ? (
          <p className="mt-2 rounded border border-line bg-raised px-2 py-1.5 text-[11px] text-muted">
            Read-only mode: sharing changes are disabled.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 rounded border border-alert/50 bg-alert/15 px-2 py-1.5 text-[11px] text-alert-tint">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-2 text-[11px] text-emerald-300">
            {notice}
          </p>
        ) : null}

        <h4 className="mt-3 font-heading text-[11px] font-bold uppercase tracking-widest text-muted">
          People with access
        </h4>
        {loading ? (
          <p className="mt-1 text-[11px] text-muted">Loading permissions…</p>
        ) : permissions.length === 0 ? (
          <p className="mt-1 text-[11px] text-muted">No permissions returned.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {permissions.map((permission) => (
              <li
                key={permission.id ?? permissionLabel(permission)}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-line/70 bg-page/60 px-2 py-1"
              >
                <span className="break-all">
                  {permissionLabel(permission)}
                  <span className="ml-2 font-mono text-[10px] text-muted">
                    {isOwnerPermission(permission) ? 'owner' : permission.role ?? permission.type}
                  </span>
                </span>
                {isOwnerPermission(permission) ? (
                  <span className="text-[10px] text-muted">Owner</span>
                ) : pendingRemove === permission.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void removePermission(permission)}
                      disabled={busy || readOnly}
                      className="rounded border border-red-700 bg-red-950/50 px-2 py-0.5 text-[10px] font-semibold text-red-200 disabled:opacity-50"
                    >
                      Confirm remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingRemove('')}
                      disabled={busy}
                      className="rounded border border-line px-2 py-0.5 text-[10px] text-muted"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingRemove(permission.id)}
                    disabled={busy || readOnly}
                    className="rounded border border-line-strong px-2 py-0.5 text-[10px] font-semibold text-ink disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="mt-3 space-y-2">
          <label className="block">
            <span className="text-muted">Add a reader</span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError('');
              }}
              disabled={readOnly || busy}
              placeholder="name@example.com"
              autoComplete="email"
              className="mt-1 w-full rounded border border-line bg-page px-2 py-1 text-xs text-ink disabled:opacity-50"
            />
          </label>
          {emailError ? (
            <p role="alert" className="text-[11px] text-red-300">
              {emailError}
            </p>
          ) : null}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notify}
              onChange={(event) => setNotify(event.target.checked)}
              disabled={readOnly || busy}
            />
            <span>Send Google Drive notification email</span>
          </label>
          <label className="block">
            <span className="text-muted">Optional message</span>
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={readOnly || busy}
              maxLength={200}
              className="mt-1 w-full rounded border border-line bg-page px-2 py-1 text-xs text-ink disabled:opacity-50"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="rounded border border-line px-2.5 py-1 text-muted disabled:opacity-50"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={readOnly || busy}
              className="rounded border border-line-strong bg-raised px-2.5 py-1 font-semibold text-ink disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Add reader'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
