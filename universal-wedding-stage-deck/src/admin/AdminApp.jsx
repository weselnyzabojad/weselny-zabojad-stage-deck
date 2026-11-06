import { useEffect, useMemo, useRef, useState } from 'react';
import { roleLabel, roleShort } from '../lib/roles';
import { validateCartridge } from '../lib/cartridgeImporter';
import {
  adminConfigured,
  archiveWedding,
  deleteWedding,
  duplicateWedding,
  enrollTotp,
  getAdminSession,
  getMfaState,
  onAdminAuthChange,
  publishWedding,
  revokeSession,
  rotatePins,
  signInAdmin,
  signOutAdmin,
  verifyTotp,
  listAdminData,
} from './adminApi';
import {
  buildQrCards,
  ADMIN_WARNING_MS,
  createAdminSession,
  filterWeddings,
  formatAdminTime,
  getAdminSessionState,
  presenceStatus,
  shouldWarnAdminSession,
  touchAdminSession,
  validateRoomCode,
  validateRoles,
  validateWeddingId,
  ROLE_IDS,
} from './adminUtils';
import AdminQrCards from './AdminQrCards';
import AdminToast from './AdminToast';
import {
  AdminConfirmDialog,
  AdminDuplicateDialog,
  AdminMfaDialog,
  AdminPinDialog,
} from './AdminDialogs';

function AdminSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="animate-pulse rounded-xl border border-line bg-card p-4">
          <div className="h-3 w-1/3 rounded bg-raised" />
          <div className="mt-2 h-2 w-2/3 rounded bg-raised" />
          <div className="mt-2 h-2 w-1/2 rounded bg-raised" />
        </div>
      ))}
    </div>
  );
}

function ErrorLine({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded border border-alert/60 bg-alert/15 px-3 py-2 text-xs text-alert-soft">
      {children}
    </p>
  );
}

function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signInAdmin(email, password);
      onSignedIn();
    } catch (err) {
      setError(err.message ?? 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-2xl">
        <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-soft">
          Owner admin
        </div>
        <h1 className="mt-1 font-heading text-xl font-bold text-white">Sign in</h1>
        <p className="mt-1 text-xs text-slate-400">
          Allowlisted owners only. No self-signup.
        </p>

        <label className="mt-4 block font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
            className="mt-1.5 w-full rounded-lg border border-line bg-page px-3 py-2.5 text-sm text-white outline-none focus:border-brand-strong"
          />
        </label>

        <label className="mt-3 block font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="mt-1.5 w-full rounded-lg border border-line bg-page px-3 py-2.5 text-sm text-white outline-none focus:border-brand-strong"
          />
        </label>

        <div className="mt-3">
          <ErrorLine>{error}</ErrorLine>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-3 w-full rounded-xl border border-brand-strong bg-brand py-3 font-heading text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

function MfaGate({ mfa, onVerified }) {
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mfa?.needsEnrollment) return undefined;
    let cancelled = false;
    enrollTotp()
      .then((data) => {
        if (!cancelled) setEnrollment(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Could not start TOTP enrollment.');
      });
    return () => {
      cancelled = true;
    };
  }, [mfa?.needsEnrollment]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (enrollment) {
        await verifyTotp(enrollment.factorId, code);
      } else {
        await challengeExistingFactor(code);
      }
      onVerified();
    } catch (err) {
      setError(err.message ?? 'MFA verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
        <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-soft">
          Owner admin
        </div>
        <h1 className="mt-1 font-heading text-xl font-bold text-white">
          {enrollment ? 'Set up TOTP MFA' : 'Two-factor check'}
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          {enrollment
            ? 'Scan the QR code with an authenticator app, then enter the 6-digit code. This factor is required on every admin session.'
            : 'Enter the 6-digit code from your authenticator app.'}
        </p>

        {enrollment ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-line bg-page p-3">
            {enrollment.qrCode ? (
              <img src={enrollment.qrCode} alt="TOTP enrollment QR code" className="h-44 w-44 rounded bg-white p-2" />
            ) : null}
            <div className="break-all font-mono text-[10px] text-slate-400">
              {enrollment.secret}
            </div>
          </div>
        ) : null}

        <label className="mt-4 block font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          6-digit code
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            className="mt-1.5 w-full rounded-lg border border-line bg-page px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] text-white outline-none focus:border-brand-strong"
          />
        </label>

        <div className="mt-3">
          <ErrorLine>{error}</ErrorLine>
        </div>

        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="mt-3 w-full rounded-xl border border-brand-strong bg-brand py-3 font-heading text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </div>
  );
}

function PinResult({ result, wedding, publicDeckUrl, onClose }) {
  const [revealed, setRevealed] = useState(true);
  const [copyNotice, setCopyNotice] = useState('');
  if (!result) return null;
  const rows = Object.entries(result.roles ?? {});

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice(label);
      setTimeout(() => setCopyNotice(''), 2500);
    } catch {
      setCopyNotice('Could not copy to the clipboard.');
    }
  };
  const cards = result.cards ?? buildQrCards({
    baseUrl: publicDeckUrl,
    roomCode: result.roomCode ?? wedding?.room_code,
    wedding: wedding ?? { weddingId: result.weddingId },
    roles: rows.map(([role]) => role),
    labels: Object.fromEntries(ROLE_IDS.map((role) => [role, roleLabel(role)])),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-line bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-white">
              {result.qrOnly ? 'QR cards' : 'PINs shown once'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {result.qrOnly
                ? 'Print these cards for the crew. The PIN is never printed; each device enters it after scanning.'
                : 'Store these now. Only bcrypt hashes are saved; republishing rotates them.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded border border-line px-2 py-1 text-xs text-slate-300">
            Close
          </button>
        </div>

        <div className={result.qrOnly ? 'hidden' : 'mt-4'}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-slate-500">
              Re-publishing rotates these PINs and invalidates old cards.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRevealed((value) => !value)}
                className="rounded border border-line px-2 py-1 text-[10px] font-semibold text-slate-300"
              >
                {revealed ? 'Hide PINs' : 'Reveal PINs'}
              </button>
              <button
                type="button"
                onClick={() => copy(rows.map(([role, pin]) => `${role}: ${pin}`).join('\n'), 'All PINs copied.')}
                className="rounded border border-line-strong bg-raised px-2 py-1 text-[10px] font-semibold text-slate-200"
              >
                Copy all PINs
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map(([role, pin]) => (
              <div key={role} className="rounded-lg border border-line bg-page p-3">
                <div className="font-heading text-[10px] uppercase tracking-widest text-slate-400">
                  {roleLabel(role)}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-2xl font-bold tracking-[0.3em] text-white">
                    {revealed ? pin : '••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(pin, `${roleLabel(role)} PIN copied.`)}
                    className="rounded border border-line px-2 py-1 text-[10px] font-semibold text-slate-300"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
          {copyNotice ? (
            <p role="status" className="mt-2 font-mono text-[10px] text-emerald-300">
              {copyNotice}
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold text-white">Printable QR cards</h3>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded border border-line-strong bg-raised px-3 py-1.5 text-xs font-semibold text-slate-200"
            >
              Print cards
            </button>
          </div>
          <AdminQrCards cards={cards} />
        </div>
      </div>
    </div>
  );
}

function CreateWeddingForm({ onCreated, onCancel }) {
  const [weddingId, setWeddingId] = useState('');
  const [couple, setCouple] = useState('');
  const [date, setDate] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roles, setRoles] = useState(['mc', 'dj']);
  const [cartridgeJson, setCartridgeJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggleRole = (role) => {
    setRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!validateWeddingId(weddingId)) {
      setError('Wedding id must look like 2026-08-20_jennifer_guillaume.');
      return;
    }
    if (roomCode && !validateRoomCode(roomCode)) {
      setError('Room code must be 6–12 lowercase letters/digits.');
      return;
    }
    if (validateRoles(roles).length === 0) {
      setError('Select at least one role.');
      return;
    }

    let cartridge;
    try {
      cartridge = JSON.parse(cartridgeJson);
    } catch (err) {
      setError(`Cartridge JSON is invalid: ${err.message}`);
      return;
    }

    setBusy(true);
    const validation = await validateCartridge(cartridge);
    if (!validation.valid) {
      setBusy(false);
      setError(validation.errors.map((item) => `${item.location}: ${item.message}`).join('\n'));
      return;
    }

    try {
      const result = await publishWedding({
        weddingId: weddingId.trim(),
        couple: couple.trim() || undefined,
        date: date.trim() || undefined,
        roomCode: roomCode.trim() || undefined,
        roles,
        cartridge: validation.cartridge,
      });
      onCreated(result, { couple: couple.trim(), date: date.trim() });
    } catch (err) {
      setError(err.message ?? 'Could not create the wedding.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-bold text-white">Create / publish wedding</h3>
        <button type="button" onClick={onCancel} className="text-xs text-slate-400">
          Cancel
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Wedding id
          <input
            value={weddingId}
            onChange={(event) => setWeddingId(event.target.value)}
            placeholder="2026-08-20_jennifer_guillaume"
            className="mt-1 w-full rounded border border-line bg-page px-2.5 py-2 font-mono text-xs text-white"
          />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Couple
          <input
            value={couple}
            onChange={(event) => setCouple(event.target.value)}
            placeholder="Jennifer & Guillaume"
            className="mt-1 w-full rounded border border-line bg-page px-2.5 py-2 text-xs text-white"
          />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Date
          <input
            value={date}
            onChange={(event) => setDate(event.target.value)}
            placeholder="20.08.2026"
            className="mt-1 w-full rounded border border-line bg-page px-2.5 py-2 font-mono text-xs text-white"
          />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Room code (optional)
          <input
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toLowerCase())}
            placeholder="auto-generated"
            className="mt-1 w-full rounded border border-line bg-page px-2.5 py-2 font-mono text-xs text-white"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {ROLE_IDS.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => toggleRole(role)}
            className={`rounded border px-2 py-1 text-[10px] font-semibold ${
              roles.includes(role)
                ? 'border-brand-strong bg-brand/40 text-white'
                : 'border-line bg-raised text-slate-400'
            }`}
          >
            {roleShort(role)}
          </button>
        ))}
      </div>

      <label className="mt-3 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Cartridge JSON
        <textarea
          value={cartridgeJson}
          onChange={(event) => setCartridgeJson(event.target.value)}
          rows={8}
          spellCheck={false}
          className="mt-1 w-full rounded border border-line bg-page px-2.5 py-2 font-mono text-[10px] text-white"
        />
      </label>

      <div className="mt-3">
        <ErrorLine>{error}</ErrorLine>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-3 rounded-lg border border-brand-strong bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
      >
        {busy ? 'Publishing…' : 'Publish wedding'}
      </button>
    </form>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState(null);
  const [mfa, setMfa] = useState(null);
  const [booting, setBooting] = useState(true);
  const [authError, setAuthError] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('weddings');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [roleFilter, setRoleFilter] = useState('');
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const [pinResult, setPinResult] = useState(null);
  const [pinWedding, setPinWedding] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pinDialog, setPinDialog] = useState(null);
  const [duplicateDialog, setDuplicateDialog] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [mfaAction, setMfaAction] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [clock, setClock] = useState(() => createAdminSession());
  const clockRef = useRef(clock);
  const loadingRef = useRef(false);

  const configured = adminConfigured();

  const refreshMfa = async (nextSession = session) => {
    if (!nextSession) {
      setMfa(null);
      return;
    }
    try {
      setMfa(await getMfaState());
    } catch (err) {
      setAuthError(err.message ?? 'Could not read MFA state.');
      setMfa(null);
    }
  };

  useEffect(() => {
    if (!configured) {
      setBooting(false);
      return undefined;
    }
    let cancelled = false;
    getAdminSession()
      .then(async (next) => {
        if (cancelled) return;
        setSession(next);
        if (next) await refreshMfa(next);
      })
      .catch((err) => {
        if (!cancelled) setAuthError(err.message ?? 'Could not read the admin session.');
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });

    const unsubscribe = onAdminAuthChange(async (next) => {
      setSession(next);
      if (next) await refreshMfa(next);
      else setMfa(null);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    clockRef.current = clock;
  }, [clock]);

  const pushToast = (message, tone = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((current) => [...current, { id, message, tone }]);
    if (tone !== 'error') {
      setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4000);
    }
  };

  const dismissToast = (id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const staySignedIn = () => {
    setClock((current) => touchAdminSession(current));
    setWarningDismissed(true);
  };

  const signOut = async () => {
    try {
      await signOutAdmin();
    } finally {
      setSession(null);
      setMfa(null);
      setData(null);
    }
  };

  // 30-minute idle / 8-hour absolute admin session.
  useEffect(() => {
    if (!session || mfa?.currentLevel !== 'aal2') return undefined;
    const activity = () => setClock((current) => touchAdminSession(current));
    window.addEventListener('pointerdown', activity);
    window.addEventListener('keydown', activity);
    const interval = setInterval(() => {
      const state = getAdminSessionState({ session: clockRef.current });
      if (state.expired) signOut();
    }, 30_000);
    return () => {
      window.removeEventListener('pointerdown', activity);
      window.removeEventListener('keydown', activity);
      clearInterval(interval);
    };
  }, [session, mfa?.currentLevel]);

  const load = async (silent = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const next = await listAdminData();
      setData(next);
      setLastLoadedAt(Date.now());
    } catch (err) {
      setError(err.message ?? 'Could not load the admin library.');
    } finally {
      loadingRef.current = false;
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (session && mfa?.currentLevel === 'aal2') load();
  }, [session, mfa?.currentLevel]);

  // Presence is a live view: refresh while visible, pause in a hidden tab and
  // never overlap an in-flight request.
  useEffect(() => {
    if (tab !== 'presence' || !session || mfa?.currentLevel !== 'aal2') return undefined;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      setNowTick(Date.now());
      load(true);
    };
    const interval = setInterval(tick, 20_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [tab, session, mfa?.currentLevel]);

  const closeDialogs = () => {
    setDialogError('');
    setDialogBusy(false);
  };

  const askMfa = (action) => {
    setDialogError('');
    setMfaAction(() => action);
  };

  const handleMfaVerified = async () => {
    const action = mfaAction;
    setMfaAction(null);
    if (!action) return;
    try {
      await action();
    } catch (err) {
      pushToast(err.message ?? 'Admin action failed.', 'error');
    }
  };

  const handleRotate = (wedding) => {
    setDialogError('');
    setPinDialog(wedding);
  };

  const handlePinSubmit = (pins) => {
    const wedding = pinDialog;
    setPinDialog(null);
    if (!wedding) return;
    const normalized = Object.fromEntries(
      Object.entries(pins).filter(([, pin]) => /^\d{6}$/.test(pin)),
    );
    askMfa(async () => {
      const result = await rotatePins(
        wedding.wedding_id,
        wedding.roles,
        Object.keys(normalized).length > 0 ? normalized : null,
      );
      setPinWedding(wedding);
      setPinResult(result);
      await load();
      pushToast('PINs rotated. Old PINs are now invalid.', 'success');
    });
  };

  const handleDuplicate = (wedding) => {
    setDialogError('');
    setDuplicateDialog(wedding);
  };

  const handleDuplicateSubmit = async ({ weddingId, couple, date }) => {
    const wedding = duplicateDialog;
    if (!wedding) return;
    setDialogBusy(true);
    setDialogError('');
    try {
      const result = await duplicateWedding({
        sourceWeddingId: wedding.wedding_id,
        weddingId,
        couple,
        date,
      });
      setDuplicateDialog(null);
      setPinWedding({ ...wedding, wedding_id: result.weddingId, room_code: result.roomCode });
      setPinResult(result);
      await load();
      pushToast('Wedding duplicated.', 'success');
    } catch (err) {
      setDialogError(err.message ?? 'Could not duplicate the wedding.');
    } finally {
      setDialogBusy(false);
    }
  };

  const handleArchive = (wedding) => {
    setDialogError('');
    setConfirmDialog({
      title: 'Archive wedding',
      description: `Archive ${wedding.couple}? Devices will no longer be able to join until it is restored in the database.`,
      confirmLabel: 'Archive',
      tone: 'danger',
      onConfirm: () => {
        setConfirmDialog(null);
        askMfa(async () => {
          await archiveWedding(wedding.wedding_id);
          await load();
          pushToast('Wedding archived.', 'success');
        });
      },
    });
  };

  const handleDelete = (wedding) => {
    setDialogError('');
    setConfirmDialog({
      title: 'Delete wedding permanently',
      description: 'This removes the wedding, roles, sessions and presence. It cannot be undone.',
      confirmLabel: 'Delete permanently',
      tone: 'danger',
      requireText: wedding.wedding_id,
      onConfirm: () => {
        setConfirmDialog(null);
        askMfa(async () => {
          await deleteWedding(wedding.wedding_id);
          await load();
          pushToast('Wedding deleted.', 'success');
        });
      },
    });
  };

  const handleRevoke = (entry) => {
    setDialogError('');
    setConfirmDialog({
      title: 'Revoke device session',
      description: `${roleLabel(entry.role)} on ${entry.device_label || entry.device_id} must join again with its PIN.`,
      confirmLabel: 'Revoke session',
      tone: 'danger',
      onConfirm: () => {
        setConfirmDialog(null);
        askMfa(async () => {
          await revokeSession(entry.jti);
          await load();
          pushToast('Device session revoked.', 'success');
        });
      },
    });
  };

  const showQr = (wedding) => {
    const cards = buildQrCards({
      baseUrl: data?.publicDeckUrl,
      roomCode: wedding.room_code,
      wedding: {
        weddingId: wedding.wedding_id,
        couple: wedding.couple,
        date: wedding.date,
        venue: wedding.venue,
      },
      roles: wedding.roles,
      labels: Object.fromEntries(ROLE_IDS.map((role) => [role, roleLabel(role)])),
    });
    setPinWedding(wedding);
    setPinResult({ weddingId: wedding.wedding_id, roomCode: wedding.room_code, roles: {}, qrOnly: true, cards });
  };

  const filteredWeddings = useMemo(
    () =>
      filterWeddings(data?.weddings ?? [], {
        query,
        status: statusFilter,
        role: roleFilter || null,
      }),
    [data, query, statusFilter, roleFilter],
  );

  const changeTab = (id) => {
    setTab(id);
    window.setTimeout(() => document.getElementById('admin-tab-panel')?.focus(), 0);
  };

  const copyRoomCode = async (roomCode) => {
    try {
      await navigator.clipboard.writeText(roomCode);
      pushToast(`Room code ${roomCode} copied.`, 'success');
    } catch {
      pushToast('Could not copy the room code.', 'error');
    }
  };

  const presenceByJti = useMemo(() => {
    const map = new Map();
    for (const entry of data?.presence ?? []) {
      if (entry.session_jti) map.set(entry.session_jti, entry);
    }
    return map;
  }, [data]);

  const sessionState = getAdminSessionState({ session: clock });
  const showIdleWarning = shouldWarnAdminSession({ session: clock }) && !warningDismissed;

  useEffect(() => {
    if (getAdminSessionState({ session: clock }).idleRemainingMs > ADMIN_WARNING_MS) {
      setWarningDismissed(false);
    }
  }, [clock]);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4 text-slate-100">
        <div className="max-w-md rounded-2xl border border-line bg-card p-6 text-center">
          <h1 className="font-heading text-lg font-bold text-white">Admin is not configured</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, deploy the
            <code> admin_api</code> function, and apply the owner-admin migration.
          </p>
        </div>
      </div>
    );
  }

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-sm text-slate-400">
        Loading owner admin…
      </div>
    );
  }

  if (!session) {
    return <AdminLogin onSignedIn={() => getAdminSession().then((next) => { setSession(next); refreshMfa(next); })} />;
  }

  if (!mfa || mfa.currentLevel !== 'aal2') {
    return <MfaGate mfa={mfa} onVerified={() => refreshMfa(session)} />;
  }

  return (
    <div className="min-h-screen bg-page text-slate-100">
      <header className="sticky top-0 z-20 border-b border-line bg-card px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-soft">
              Owner admin
            </div>
            <h1 className="font-heading text-lg font-bold text-white">Wedding library</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded border border-line bg-raised px-2 py-1 font-mono text-[10px] text-slate-400">
              idle {Math.ceil(sessionState.idleRemainingMs / 60000)}m · absolute{' '}
              {Math.floor(sessionState.absoluteRemainingMs / 3600000)}h
            </span>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="rounded border border-line-strong bg-raised px-2.5 py-1 font-semibold text-slate-200 disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rounded border border-line px-2.5 py-1 text-slate-400"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto mt-3 flex max-w-6xl gap-2 text-xs">
          {[
            ['weddings', 'Weddings'],
            ['presence', 'Live presence'],
            ['audit', 'Audit log'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => changeTab(id)}
              className={`rounded border px-3 py-1.5 font-semibold ${
                tab === id
                  ? 'border-brand-strong bg-brand/40 text-white'
                  : 'border-line bg-raised text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main id="admin-tab-panel" tabIndex={-1} className="mx-auto max-w-6xl space-y-4 px-4 py-4">
        {authError || error ? <ErrorLine>{authError || error}</ErrorLine> : null}

        {showIdleWarning ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-700 bg-amber-950/70 px-4 py-3 text-xs text-amber-100"
          >
            <span>
              Your admin session expires in{' '}
              <strong className="font-mono">
                {Math.max(1, Math.ceil(sessionState.idleRemainingMs / 60000))}m
              </strong>{' '}
              due to inactivity.
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={staySignedIn}
                className="rounded border border-amber-600 bg-amber-900/60 px-3 py-1.5 font-semibold text-amber-100"
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={signOut}
                className="rounded border border-line px-3 py-1.5 text-slate-300"
              >
                Sign out now
              </button>
            </span>
          </div>
        ) : null}
        {loading ? <AdminSkeleton rows={3} /> : null}

        {tab === 'weddings' ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-sm font-bold text-white">
                {filteredWeddings.length} of {data?.weddings?.length ?? 0} weddings
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate((value) => !value)}
                className="rounded border border-brand-strong bg-brand px-3 py-1.5 text-xs font-bold text-white"
              >
                {showCreate ? 'Close form' : 'New wedding'}
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-card p-3">
              <label className="min-w-[12rem] flex-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Search
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Couple, wedding id or room code"
                  className="mt-1 w-full rounded border border-line bg-page px-2.5 py-2 text-xs text-white"
                />
              </label>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="mt-1 block rounded border border-line bg-page px-2.5 py-2 text-xs text-white"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="all">All</option>
                </select>
              </label>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Role
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="mt-1 block rounded border border-line bg-page px-2.5 py-2 text-xs text-white"
                >
                  <option value="">All roles</option>
                  {ROLE_IDS.map((role) => (
                    <option key={role} value={role}>{roleShort(role)}</option>
                  ))}
                </select>
              </label>
            </div>

            {showCreate ? (
              <CreateWeddingForm
                onCancel={() => setShowCreate(false)}
                onCreated={(result, meta) => {
                  setShowCreate(false);
                  setPinResult(result);
                  setPinWedding({
                    wedding_id: result.weddingId,
                    room_code: result.roomCode,
                    couple: meta?.couple,
                    date: meta?.date,
                  });
                  load();
                }}
              />
            ) : null}

            <div className="space-y-3">
              {filteredWeddings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-card p-6 text-center text-xs text-slate-400">
                  <p>No weddings match this filter. Create one or switch to All.</p>
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="mt-3 rounded border border-brand-strong bg-brand px-3 py-1.5 text-xs font-bold text-white"
                  >
                    New wedding
                  </button>
                </div>
              ) : null}
              {filteredWeddings.map((wedding) => (
                <article
                  key={wedding.wedding_id}
                  className={`rounded-xl border p-4 ${
                    wedding.archived_at ? 'border-line bg-page/60 opacity-70' : 'border-line bg-card'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-base font-bold text-white">{wedding.couple || '—'}</h3>
                        {wedding.archived_at ? (
                          <span className="rounded border border-amber-700 bg-amber-950/60 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
                            ARCHIVED
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-slate-400">
                        <span>{wedding.wedding_id} · {wedding.date || '—'} · room {wedding.room_code}</span>
                        <button
                          type="button"
                          onClick={() => copyRoomCode(wedding.room_code)}
                          className="rounded border border-line px-1.5 py-0.5 text-[9px] font-semibold text-slate-300 hover:bg-line"
                        >
                          Copy code
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(wedding.roles ?? []).map((role) => (
                          <span key={role} className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[9px] text-brand-tint">
                            {roleShort(role)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleRotate(wedding)}
                        className="rounded border border-line-strong bg-raised px-2 py-1 font-semibold text-slate-200"
                      >
                        Rotate PINs
                      </button>
                      <button
                        type="button"
                        onClick={() => showQr(wedding)}
                        className="rounded border border-line-strong bg-raised px-2 py-1 font-semibold text-slate-200"
                      >
                        QR cards
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(wedding)}
                        className="rounded border border-line-strong bg-raised px-2 py-1 font-semibold text-slate-200"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(wedding)}
                        className="rounded border border-amber-800 bg-amber-950/60 px-2 py-1 font-semibold text-amber-200"
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(wedding)}
                        className="rounded border border-alert/60 bg-alert/20 px-2 py-1 font-semibold text-alert-soft"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 font-mono text-[9px] text-slate-500">
                    updated {formatAdminTime(wedding.updated_at)} · expires {formatAdminTime(wedding.expires_at)}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}

        {tab === 'presence' ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-sm font-bold text-white">Live presence</h2>
              <span className="inline-flex items-center gap-1.5 rounded border border-line bg-raised px-2 py-1 font-mono text-[10px] text-slate-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                Live · updated{' '}
                {lastLoadedAt ? `${Math.max(0, Math.round((nowTick - lastLoadedAt) / 1000))}s ago` : '—'}
              </span>
            </div>
          <section className="overflow-x-auto rounded-xl border border-line bg-card">
            {(data?.sessions ?? []).length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">
                No devices have joined yet. Share a QR card or room code.
              </p>
            ) : (
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-line font-heading text-[9px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-3 py-2">Role / device</th>
                  <th className="px-3 py-2">Wedding</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">View</th>
                  <th className="px-3 py-2">Last seen</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {(data?.sessions ?? []).map((entry) => {
                  const presence = presenceByJti.get(entry.jti);
                  const status = entry.revoked_at
                    ? 'revoked'
                    : presenceStatus({
                        lastSeen: presence?.last_seen ?? entry.issued_at,
                        tokenExpiresAt: entry.expires_at,
                        now: nowTick,
                      });
                  return (
                    <tr key={entry.jti} className="border-b border-line/60">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-white">{roleLabel(entry.role)}</div>
                        <div className="font-mono text-[9px] text-slate-500">
                          {entry.device_label || entry.device_id}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{entry.wedding_id}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                            status === 'online'
                              ? 'bg-emerald-950/60 text-emerald-300'
                              : status === 'idle'
                                ? 'bg-amber-950/60 text-amber-200'
                                : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-400">
                        {presence?.current_view ?? '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-400">
                        {formatAdminTime(presence?.last_seen ?? entry.issued_at)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-400">
                        {formatAdminTime(entry.expires_at)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!entry.revoked_at ? (
                          <button
                            type="button"
                            onClick={() => handleRevoke(entry)}
                            className="rounded border border-alert/60 bg-alert/20 px-2 py-1 text-[10px] font-semibold text-alert-soft"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="font-mono text-[9px] text-slate-600">revoked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </section>
          </>
        ) : null}

        {tab === 'audit' ? (
          <section className="space-y-2">
            {(data?.audit ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-card p-6 text-center text-xs text-slate-400">
                No admin actions recorded on this deployment.
              </p>
            ) : null}
            {(data?.audit ?? []).map((entry) => (
              <article key={entry.id} className="rounded-lg border border-line bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-slate-500">
                  <span>
                    {entry.action} · {entry.target || '—'}
                  </span>
                  <span>{formatAdminTime(entry.created_at)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-300">
                  {entry.actor_email || entry.actor_id || 'unknown actor'}
                </div>
                {entry.detail ? (
                  <pre className="mt-1 overflow-x-auto rounded bg-page p-2 font-mono text-[9px] text-slate-500">
                    {JSON.stringify(entry.detail, null, 2)}
                  </pre>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}
      </main>

      <AdminToast toasts={toasts} onDismiss={dismissToast} />

      <AdminConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description}
        confirmLabel={confirmDialog?.confirmLabel}
        tone={confirmDialog?.tone}
        requireText={confirmDialog?.requireText}
        busy={dialogBusy}
        error={dialogError}
        onConfirm={confirmDialog?.onConfirm}
        onCancel={() => {
          setConfirmDialog(null);
          closeDialogs();
        }}
      />

      <AdminMfaDialog
        open={Boolean(mfaAction)}
        title="Confirm with TOTP"
        description="Destructive owner actions require a fresh authenticator code."
        onVerified={handleMfaVerified}
        onCancel={() => {
          setMfaAction(null);
          closeDialogs();
        }}
      />

      <AdminPinDialog
        open={Boolean(pinDialog)}
        roles={pinDialog?.roles ?? []}
        onSubmit={handlePinSubmit}
        onCancel={() => {
          setPinDialog(null);
          closeDialogs();
        }}
        busy={dialogBusy}
        error={dialogError}
      />

      <AdminDuplicateDialog
        open={Boolean(duplicateDialog)}
        wedding={duplicateDialog}
        onSubmit={handleDuplicateSubmit}
        onCancel={() => {
          setDuplicateDialog(null);
          closeDialogs();
        }}
        busy={dialogBusy}
        error={dialogError}
      />

      <PinResult
        result={pinResult}
        wedding={pinWedding}
        publicDeckUrl={data?.publicDeckUrl}
        onClose={() => {
          setPinResult(null);
          setPinWedding(null);
        }}
      />
    </div>
  );
}
