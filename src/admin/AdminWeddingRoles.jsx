import { useCallback, useEffect, useMemo, useState } from 'react';
import { ROLES, ROLE_ORDER, roleLabel } from '../lib/roles';
import { buildQrCards } from './adminUtils';
import {
  confirmWeddingMc,
  listProviders,
  listWeddingRoles,
  removeWeddingRole,
  setWeddingRole,
} from './adminApi';
import AdminQrCards from './AdminQrCards';
import { AdminConfirmDialog, AdminPinDialog } from './AdminDialogs';

// Per-wedding roles and views panel (issue #876). The package only supplies
// defaults at first publication; every action here is authoritative afterwards.
export default function AdminWeddingRoles({ wedding, readOnly = false, onChanged }) {
  const [data, setData] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [qrCards, setQrCards] = useState(null);
  const [pinRole, setPinRole] = useState(null);
  const [removeRole, setRemoveRole] = useState(null);

  const load = useCallback(async () => {
    try {
      const [roles, providerData] = await Promise.all([
        listWeddingRoles(wedding.wedding_id),
        listProviders(wedding.wedding_id),
      ]);
      setData(roles);
      setProviders(providerData.providers ?? []);
    } catch (err) {
      setError(err.message ?? 'Could not load roles.');
    } finally {
      setLoading(false);
    }
  }, [wedding.wedding_id]);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- load() reports the external admin list request state
    load();
  }, [load]);

  const enabled = useMemo(
    () => new Set((data?.roles ?? []).map((row) => row.role)),
    [data],
  );
  const managed = useMemo(
    () => new Set((providers ?? []).filter((row) => row.active).map((row) => row.category)),
    [providers],
  );
  const djMcWedding = data?.servicePackage === 'DJ_MC';
  const visibleRoles = djMcWedding
    ? ROLE_ORDER.filter((role) => role === 'dj_mc')
    : ROLE_ORDER.filter((role) => role !== 'dj_mc');
  const vipWedding =
    data?.servicePackage === 'HOST_AND_DJ_VIP' || data?.servicePackage === 'DJ_MC';

  const run = async (action, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await action();
      setNotice(message(result));
      await load();
      onChanged?.();
      return result;
    } catch (err) {
      setError(err.message ?? 'Role action failed.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const enable = (role) =>
    run(
      () => setWeddingRole(wedding.wedding_id, role),
      (result) => `${roleLabel(role)} enabled. PIN: ${result.pin ?? 'unchanged'}`,
    );

  const disable = (role) =>
    run(
      () => removeWeddingRole(wedding.wedding_id, role),
      () => `${roleLabel(role)} disabled.`,
    );

  const showQr = () => {
    const cards = buildQrCards({
      baseUrl: 'https://deck.weselnyzabojad.pl',
      roomCode: wedding.room_code,
      wedding: { weddingId: wedding.wedding_id, couple: wedding.couple, date: wedding.date },
      roles: [...enabled].filter((role) => role !== 'dj_mc' || enabled.has('dj_mc')),
      labels: Object.fromEntries([...enabled].map((role) => [role, roleLabel(role)])),
    });
    if (data?.songRequestUrl) {
      cards.push({
        role: 'song_request',
        label: 'Song requests',
        url: data.songRequestUrl,
        roomCode: wedding.room_code,
        couple: wedding.couple,
        date: wedding.date,
      });
    }
    setQrCards(cards);
  };

  if (loading) {
    return <p className="mt-2 text-[10px] text-muted">Loading roles…</p>;
  }

  return (
    <details className="mt-3 rounded-lg border border-line bg-page/40 px-3 py-2" open>
      <summary className="cursor-pointer font-heading text-[11px] font-bold uppercase tracking-widest text-ink">
        Roles &amp; access
      </summary>

      {error ? (
        <p role="alert" className="mt-2 text-[10px] text-alert-soft">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-2 rounded border border-emerald-700 bg-emerald-950/40 px-2 py-1 font-mono text-[10px] text-emerald-200">
          {notice}
        </p>
      ) : null}

      <ul className="mt-2 divide-y divide-line/60">
        {visibleRoles.map((role) => {
          const isEnabled = enabled.has(role);
          const isManaged = managed.has(role);
          return (
            <li key={role} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-ink">
                  {roleLabel(role)}{' '}
                  <span className="font-mono text-[9px] text-muted">
                    {ROLES[role]?.view ?? role}
                  </span>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted">
                  {isEnabled ? 'enabled' : 'disabled'}
                  {isManaged ? ' · provider-managed' : ''}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                {isEnabled ? (
                  <button
                    type="button"
                    onClick={() => setPinRole(role)}
                    disabled={readOnly || busy}
                    className="rounded border border-line-strong bg-raised px-2 py-1 font-semibold text-ink disabled:opacity-40"
                  >
                    Rotate PIN
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => enable(role)}
                    disabled={readOnly || busy}
                    className="rounded border border-brand-strong bg-brand/30 px-2 py-1 font-semibold text-ink disabled:opacity-40"
                  >
                    Enable
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRemoveRole(role)}
                  disabled={readOnly || busy || !isEnabled || isManaged}
                  title={isManaged ? 'Deactivate the provider first.' : undefined}
                  className="rounded border border-alert/60 bg-alert/20 px-2 py-1 font-semibold text-alert-soft disabled:opacity-40"
                >
                  Disable
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {vipWedding ? (
        <div className="mt-2 rounded border border-line bg-card px-2 py-2">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted">
            MC confirmation
          </div>
          <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
            {['OWNER', 'PROVIDER'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  run(
                    () => confirmWeddingMc(wedding.wedding_id, mode),
                    () => `MC confirmed by ${mode.toLowerCase()}.`,
                  )
                }
                disabled={
                  readOnly || busy || (mode === 'PROVIDER' && !managed.has('mc'))
                }
                className={`rounded border px-2 py-1 font-semibold disabled:opacity-40 ${
                  data?.mcConfirmedBy === mode
                    ? 'border-emerald-600 bg-emerald-900/50 text-emerald-200'
                    : 'border-line-strong bg-raised text-ink'
                }`}
              >
                {mode === 'OWNER' ? 'MC = owner' : 'MC = provider'}
              </button>
            ))}
            <span className="self-center font-mono text-[9px] text-muted">
              {data?.mcConfirmedBy ?? 'unconfirmed'}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={showQr}
          disabled={enabled.size === 0}
          className="rounded border border-line-strong bg-raised px-2 py-1 text-[10px] font-semibold text-ink disabled:opacity-40"
        >
          QR cards
        </button>
        {data?.songRequestEligible && data.songRequestUrl ? (
          <a
            href={data.songRequestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-line-strong bg-raised px-2 py-1 text-[10px] font-semibold text-ink"
          >
            Open Song Requestor
          </a>
        ) : (
          <span className="font-mono text-[9px] text-muted">Song Requestor unavailable</span>
        )}
      </div>

      {qrCards ? (
        <div className="mt-2">
          <AdminQrCards cards={qrCards} />
        </div>
      ) : null}

      <AdminPinDialog
        open={Boolean(pinRole)}
        roles={pinRole ? [pinRole] : []}
        busy={busy}
        error={error}
        onCancel={() => setPinRole(null)}
        onSubmit={async (pins) => {
          const role = pinRole;
          setPinRole(null);
          await run(
            () => setWeddingRole(wedding.wedding_id, role, pins),
            (result) => `${roleLabel(role)} PIN rotated. New PIN: ${result.pin}`,
          );
        }}
      />

      <AdminConfirmDialog
        open={Boolean(removeRole)}
        title="Disable role"
        description={
          removeRole
            ? `Disable ${roleLabel(removeRole)}? Its sessions and presence will be revoked.`
            : ''
        }
        confirmLabel="Disable role"
        tone="danger"
        busy={busy}
        onCancel={() => setRemoveRole(null)}
        onConfirm={async () => {
          const role = removeRole;
          setRemoveRole(null);
          await disable(role);
        }}
      />
    </details>
  );
}
