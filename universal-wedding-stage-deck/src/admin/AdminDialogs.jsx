import { useEffect, useId, useState } from 'react';
import ModalShell from '../components/ModalShell';
import { challengeExistingFactor, getRevisionContext } from './adminApi';
import { readMediaLeaveTimes } from './adminMediaLeaves';
import { roleShort } from '../lib/roles';

function DialogBody({ title, description, titleId = undefined, descriptionId = undefined, children }) {
  return (
    <>
      <div className="border-b border-line px-5 py-4 pr-14">
        <h2 id={titleId} className="font-heading text-base font-bold text-ink">{title}</h2>
        {description ? (
          <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      <div className="max-h-[55vh] overflow-y-auto px-5 py-4">{children}</div>
    </>
  );
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'primary',
  requireText = null,
  busy = false,
  error = '',
  onConfirm,
  onCancel,
  children,
}) {
  const [typed, setTyped] = useState('');
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (open) setTyped('');
  }, [open, requireText]);

  const blocked = Boolean(requireText) && typed !== requireText;

  return (
    <ModalShell
      open={open}
      onClose={onCancel}
      labelledBy={titleId}
      describedBy={description ? descriptionId : undefined}
    >
      <DialogBody title={title} description={description} titleId={titleId} descriptionId={descriptionId}>
        {children}
        {requireText ? (
          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-widest text-muted">
            Type <span className="font-mono text-ink">{requireText}</span> to confirm
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="mt-1 w-full rounded border border-line bg-card px-2.5 py-2 font-mono text-xs text-ink"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 rounded border border-alert/60 bg-alert/15 px-3 py-2 text-xs text-alert-soft">
            {error}
          </p>
        ) : null}
      </DialogBody>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={blocked || busy}
          className={`rounded border px-3 py-1.5 text-xs font-bold text-ink disabled:opacity-50 ${
            tone === 'danger'
              ? 'border-alert/60 bg-alert/40 hover:bg-alert/60'
              : 'border-brand-strong bg-brand hover:bg-brand-hover'
          }`}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

export function AdminMfaDialog({ open, title = 'Confirm with TOTP', description, onVerified, onCancel }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCode('');
      setBusy(false);
      setError('');
    }
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await challengeExistingFactor(code);
      onVerified();
    } catch (err) {
      setError(err.message ?? 'TOTP verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onCancel} labelledBy={undefined}>
      <DialogBody
        title={title}
        description={description ?? 'Enter the 6-digit code from your authenticator app.'}
      >
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted">
          6-digit code
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="••••••"
            className="mt-1 w-full rounded border border-line bg-card px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] text-ink"
          />
        </label>
        {error ? (
          <p role="alert" className="mt-3 rounded border border-alert/60 bg-alert/15 px-3 py-2 text-xs text-alert-soft">
            {error}
          </p>
        ) : null}
      </DialogBody>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <button type="button" onClick={onCancel} className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || code.length !== 6}
          className="rounded border border-brand-strong bg-brand px-3 py-1.5 text-xs font-bold text-on-accent disabled:opacity-50"
        >
          {busy ? 'Verifying…' : 'Verify'}
        </button>
      </div>
    </ModalShell>
  );
}

export function AdminPinDialog({ open, roles = [], onSubmit, onCancel, busy = false, error = '' }) {
  const [pins, setPins] = useState({});

  useEffect(() => {
    if (open) setPins({});
  }, [open]);

  const update = (role, value) => {
    setPins((current) => ({ ...current, [role]: value.replace(/\D/g, '').slice(0, 6) }));
  };

  return (
    <ModalShell open={open} onClose={onCancel} labelledBy={undefined}>
      <DialogBody
        title="Rotate role PINs"
        description="Leave a field blank to auto-generate that role's PIN. All PINs are shown once, then stored as hashes."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((role) => (
            <label key={role} className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {roleShort(role)}
              <input
                value={pins[role] ?? ''}
                onChange={(event) => update(role, event.target.value)}
                inputMode="numeric"
                placeholder="auto"
                className="mt-1 w-full rounded border border-line bg-card px-2.5 py-2 font-mono text-sm tracking-[0.25em] text-ink"
              />
            </label>
          ))}
        </div>
        {error ? (
          <p role="alert" className="mt-3 rounded border border-alert/60 bg-alert/15 px-3 py-2 text-xs text-alert-soft">
            {error}
          </p>
        ) : null}
      </DialogBody>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <button type="button" onClick={onCancel} className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSubmit(pins)}
          disabled={busy}
          className="rounded border border-brand-strong bg-brand px-3 py-1.5 text-xs font-bold text-on-accent disabled:opacity-50"
        >
          {busy ? 'Rotating…' : 'Continue'}
        </button>
      </div>
    </ModalShell>
  );
}

export function AdminPublishRevisionDialog({
  open,
  wedding,
  onSubmit,
  onCancel,
  busy = false,
  error = '',
}) {
  const [cartridgeJson, setCartridgeJson] = useState('');
  const [parseError, setParseError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCartridgeJson('');
    setParseError('');
  }, [open, wedding]);

  const submit = () => {
    setParseError('');
    let cartridge;
    try {
      cartridge = JSON.parse(cartridgeJson);
    } catch (err) {
      setParseError(`Cartridge JSON is invalid: ${err.message}`);
      return;
    }
    onSubmit(cartridge);
  };

  return (
    <ModalShell open={open} onClose={onCancel} labelledBy={undefined}>
      <DialogBody
        title="Replace published cartridge"
        description={`Publishes a new immutable revision for ${wedding?.wedding_id ?? 'this wedding'}. The room code, PINs, sessions and live progress are preserved.`}
      >
        <p className="mb-3 rounded border border-line bg-card px-3 py-2 font-mono text-[10px] text-muted">
          current revision {Number(wedding?.cartridge_revision ?? 0)}
          {wedding?.cartridge_source ? ` · source ${wedding.cartridge_source}` : ''}
        </p>
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted">
          Cartridge JSON
          <textarea
            value={cartridgeJson}
            onChange={(event) => setCartridgeJson(event.target.value)}
            rows={12}
            spellCheck={false}
            className="mt-1 w-full rounded border border-line bg-card px-2.5 py-2 font-mono text-[10px] text-ink"
          />
        </label>
        {parseError || error ? (
          <p role="alert" className="mt-3 whitespace-pre-wrap rounded border border-alert/60 bg-alert/15 px-3 py-2 text-xs text-alert-soft">
            {parseError || error}
          </p>
        ) : null}
      </DialogBody>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <button type="button" onClick={onCancel} className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !cartridgeJson.trim()}
          className="rounded border border-brand-strong bg-brand px-3 py-1.5 text-xs font-bold text-on-accent disabled:opacity-50"
        >
          {busy ? 'Publishing…' : 'Publish revision'}
        </button>
      </div>
    </ModalShell>
  );
}

export function AdminMediaLeaveDialog({
  open,
  wedding,
  onSubmit,
  onCancel,
  busy = false,
  error = '',
}) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [context, setContext] = useState(null);
  const [times, setTimes] = useState({ photo: '', camera: '' });

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setLoading(true);
    setLoadError('');
    setContext(null);
    setTimes({ photo: '', camera: '' });

    getRevisionContext(wedding.wedding_id)
      .then((next) => {
        if (!active) return;
        setContext(next);
        setTimes(readMediaLeaveTimes(next?.wedding?.cartridge));
      })
      .catch((err) => {
        if (active) setLoadError(err.message ?? 'Could not load the cartridge.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, wedding?.wedding_id]);

  const submit = () => {
    if (!context?.wedding?.cartridge) return;
    onSubmit({
      times,
      cartridge: context.wedding.cartridge,
      expectedRevision: Number(context.wedding.cartridge_revision ?? 0),
    });
  };

  return (
    <ModalShell open={open} onClose={onCancel} labelledBy={undefined}>
      <DialogBody
        title="Media leave times"
        description={`Updates the Photographer/Cameraman leave milestones for ${wedding?.wedding_id ?? 'this wedding'} and publishes a new cartridge revision.`}
      >
        <p className="mb-3 rounded border border-line bg-card px-3 py-2 font-mono text-[10px] text-muted">
          current revision {Number(wedding?.cartridge_revision ?? 0)}
        </p>

        {loading ? (
          <p className="text-xs text-muted">Loading the published cartridge...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              Photographer leaves
              <input
                type="time"
                value={times.photo}
                onChange={(event) => setTimes((current) => ({ ...current, photo: event.target.value }))}
                className="mt-1 w-full rounded border border-line bg-card px-2.5 py-2 font-mono text-xs text-ink"
              />
            </label>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              Cameraman leaves
              <input
                type="time"
                value={times.camera}
                onChange={(event) => setTimes((current) => ({ ...current, camera: event.target.value }))}
                className="mt-1 w-full rounded border border-line bg-card px-2.5 py-2 font-mono text-xs text-ink"
              />
            </label>
          </div>
        )}

        {loadError || error ? (
          <p role="alert" className="mt-3 whitespace-pre-wrap rounded border border-alert/60 bg-alert/15 px-3 py-2 text-xs text-alert-soft">
            {loadError || error}
          </p>
        ) : null}
      </DialogBody>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <button type="button" onClick={onCancel} className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || loading || !context?.wedding?.cartridge}
          className="rounded border border-brand-strong bg-brand px-3 py-1.5 text-xs font-bold text-on-accent disabled:opacity-50"
        >
          {busy ? 'Publishing...' : 'Publish revision'}
        </button>
      </div>
    </ModalShell>
  );
}
