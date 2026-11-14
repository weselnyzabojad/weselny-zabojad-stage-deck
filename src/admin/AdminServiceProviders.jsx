import { useCallback, useEffect, useState } from 'react';
import {
  deactivateProvider,
  deactivateVipDj,
  deleteProvider,
  listProviders,
  listVipDjs,
  upsertProvider,
  upsertVipDj,
} from './adminApi.js';
import { AdminConfirmDialog } from './AdminDialogs';

const CATEGORIES = [
  ['dj', 'DJ'],
  ['photo1', 'Photographer 1'],
  ['photo2', 'Photographer 2'],
  ['video', 'Cameraman'],
  ['venue_manager', 'Venue manager'],
  ['mc', 'MC'],
  ['dj_mc', 'DJ + MC'],
  ['other', 'Other'],
];

const EMPTY_FORM = {
  id: null,
  category: 'other',
  functionLabel: '',
  vipDjId: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  instagram: '',
  active: true,
};

const EMPTY_VIP_FORM = {
  id: '',
  displayName: '',
  phone: '',
  instagram: '',
  logoUrl: '',
  packageDefault: '',
  sortOrder: 0,
  active: true,
};

export default function AdminServiceProviders({ wedding, readOnly = false, onChanged = null }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [providers, setProviders] = useState([]);
  const [vipDjs, setVipDjs] = useState([]);
  const [vipForm, setVipForm] = useState(EMPTY_VIP_FORM);
  const [vipError, setVipError] = useState('');
  const [vipSaving, setVipSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [accessResult, setAccessResult] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [result, registry] = await Promise.all([
        listProviders(wedding.wedding_id),
        listVipDjs(),
      ]);
      setProviders(result.providers ?? []);
      setVipDjs(registry.vipDjs ?? []);
      setLoaded(true);
    } catch (cause) {
      setError(cause?.message ?? 'Could not load providers.');
    } finally {
      setLoading(false);
    }
  }, [wedding.wedding_id]);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- load() sets its loading flag before the provider list request
    if (open && !loaded && !loading) void load();
  }, [open, loaded, loading, load]);

  const edit = (provider) => {
    setForm({
      id: provider.id,
      category: provider.category,
      functionLabel: provider.function_label ?? '',
      vipDjId: provider.vip_dj_id ?? '',
      firstName: provider.first_name ?? '',
      lastName: provider.last_name ?? '',
      phone: provider.phone ?? '',
      email: provider.email ?? '',
      address: provider.address ?? '',
      instagram: provider.instagram ?? '',
      active: provider.active !== false,
    });
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (form.category === 'other' && !form.functionLabel.trim()) {
      setError('A function label is required for Other providers.');
      return;
    }
    setSaving(true);
    try {
      await upsertProvider({
        weddingId: wedding.wedding_id,
        ...form,
      }).then((result) => {
        setAccessResult(result?.roleAccess ?? null);
      });
      setForm(EMPTY_FORM);
      await load();
      onChanged?.();
    } catch (cause) {
      setError(cause?.message ?? 'Could not save the provider.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (provider) => {
    setError('');
    try {
      await deactivateProvider(wedding.wedding_id, provider.id);
      await load();
      onChanged?.();
    } catch (cause) {
      setError(cause?.message ?? 'Could not deactivate the provider.');
    }
  };

  const remove = (provider) => {
    setDeleteError('');
    setDeleteTarget(provider);
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteProvider(wedding.wedding_id, deleteTarget.id);
      setDeleteTarget(null);
      await load();
      onChanged?.();
    } catch (cause) {
      setDeleteError(cause?.message ?? 'Could not delete the provider.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const editVip = (dj) => {
    setVipForm({
      id: dj.id,
      displayName: dj.display_name ?? '',
      phone: dj.phone ?? '',
      instagram: dj.instagram ?? '',
      logoUrl: dj.logo_url ?? '',
      packageDefault: dj.package_default ?? '',
      sortOrder: dj.sort_order ?? 0,
      active: dj.active !== false,
    });
    setVipError('');
  };

  const submitVip = async (event) => {
    event.preventDefault();
    setVipError('');
    setVipSaving(true);
    try {
      await upsertVipDj({
        ...vipForm,
        packageDefault: vipForm.packageDefault || null,
      });
      setVipForm(EMPTY_VIP_FORM);
      await load();
    } catch (cause) {
      setVipError(cause?.message ?? 'Could not save the VIP DJ.');
    } finally {
      setVipSaving(false);
    }
  };

  const deactivateVip = async (dj) => {
    setVipError('');
    try {
      await deactivateVipDj(dj.id);
      await load();
    } catch (cause) {
      setVipError(cause?.message ?? 'Could not deactivate the VIP DJ.');
    }
  };

  const grouped = CATEGORIES.map(([category, label]) => ({
    category,
    label,
    rows: providers.filter((provider) => provider.category === category),
  })).filter((group) => group.rows.length > 0);
  const weddingRoles = new Set(wedding?.roles ?? []);
  const roleForCategory = {
    dj: 'dj',
    photo1: 'photo1',
    photo2: 'photo2',
    video: 'video',
    venue_manager: 'venue_manager',
    mc: 'mc',
    dj_mc: 'dj_mc',
  };

  return (
    <details
      className="mt-2 rounded-lg border border-line bg-page/50 p-2"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        Service providers
        {readOnly ? ' · read-only' : ''}
      </summary>

      <div className="mt-2 rounded border border-line bg-card/70 px-2 py-1.5">
        <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted">
          VIP DJ registry
        </p>
        <ul className="mt-1 space-y-0.5">
          {vipDjs.map((dj) => (
            <li key={dj.id} className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="font-semibold text-ink">{dj.display_name}</span>
              <span className="rounded border border-brand-strong bg-brand/30 px-1 py-0.5 font-mono text-[8px] font-bold text-brand-tint">
                {dj.active === false ? 'INACTIVE' : 'VIP'}
              </span>
              <span className="font-mono text-[9px] text-muted">
                {dj.id}
                {dj.package_default ? ` · ${dj.package_default}` : ''}
              </span>
              <span className="ml-auto flex gap-1">
                <button
                  type="button"
                  onClick={() => editVip(dj)}
                  disabled={readOnly}
                  className="rounded border border-line px-1.5 py-0.5 text-[9px] text-ink disabled:opacity-40"
                >
                  Edit
                </button>
                {dj.active !== false ? (
                  <button
                    type="button"
                    onClick={() => deactivateVip(dj)}
                    disabled={readOnly}
                    className="rounded border border-amber-800 px-1.5 py-0.5 text-[9px] text-amber-200 disabled:opacity-40"
                  >
                    Deactivate
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        <form onSubmit={submitVip} className="mt-2 grid gap-1.5 sm:grid-cols-2">
          <input
            aria-label="VIP DJ id"
            placeholder="id (lowercase)"
            value={vipForm.id}
            onChange={(event) => setVipForm((current) => ({ ...current, id: event.target.value }))}
            disabled={readOnly}
            className="rounded border border-line bg-page px-2 py-1 font-mono text-[10px] text-ink"
          />
          <input
            aria-label="VIP DJ display name"
            placeholder="Display name"
            value={vipForm.displayName}
            onChange={(event) =>
              setVipForm((current) => ({ ...current, displayName: event.target.value }))
            }
            disabled={readOnly}
            className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
          />
          <input
            aria-label="VIP DJ phone"
            placeholder="Phone (private)"
            value={vipForm.phone}
            onChange={(event) => setVipForm((current) => ({ ...current, phone: event.target.value }))}
            disabled={readOnly}
            className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
          />
          <input
            aria-label="VIP DJ Instagram"
            placeholder="Instagram (private)"
            value={vipForm.instagram}
            onChange={(event) =>
              setVipForm((current) => ({ ...current, instagram: event.target.value }))
            }
            disabled={readOnly}
            className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
          />
          <input
            aria-label="VIP DJ logo URL"
            placeholder="Logo URL"
            value={vipForm.logoUrl}
            onChange={(event) =>
              setVipForm((current) => ({ ...current, logoUrl: event.target.value }))
            }
            disabled={readOnly}
            className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
          />
          <select
            aria-label="VIP DJ package default"
            value={vipForm.packageDefault}
            onChange={(event) =>
              setVipForm((current) => ({ ...current, packageDefault: event.target.value }))
            }
            disabled={readOnly}
            className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
          >
            <option value="">No package default</option>
            <option value="HOST_AND_DJ_VIP">HOST_AND_DJ_VIP</option>
            <option value="DJ_MC">DJ_MC</option>
          </select>
          <button
            type="submit"
            disabled={readOnly || vipSaving}
            className="rounded border border-brand-strong bg-brand/30 px-2 py-1 text-[10px] font-bold text-brand-tint disabled:opacity-40 sm:col-span-2"
          >
            {vipSaving ? 'Saving…' : vipForm.id ? 'Save VIP DJ' : 'Add VIP DJ'}
          </button>
        </form>
        {vipError ? (
          <p className="mt-1 text-[10px] text-alert-soft" role="alert">
            {vipError}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 rounded border border-alert/60 bg-alert/15 px-2 py-1 text-[10px] text-alert-soft" role="alert">
          {error}
        </p>
      ) : null}
      {accessResult?.pin ? (
        <p className="mt-2 rounded border border-emerald-700 bg-emerald-950/40 px-2 py-1 text-[10px] text-emerald-200" role="status">
          Role <strong>{accessResult.role}</strong> PIN: <strong className="font-mono">{accessResult.pin}</strong> — shown once.
        </p>
      ) : null}
      {accessResult?.revoked ? (
        <p className="mt-2 rounded border border-amber-700 bg-amber-950/40 px-2 py-1 text-[10px] text-amber-200" role="status">
          Role {accessResult.role} access revoked.
        </p>
      ) : null}

      {loading ? <p className="mt-2 text-[10px] text-muted">Loading providers…</p> : null}

      {!loading && grouped.length === 0 ? (
        <p className="mt-2 text-[10px] text-muted">No service providers yet.</p>
      ) : null}

      {grouped.map((group) => (
        <div key={group.category} className="mt-2">
          <h4 className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted">
            {group.label}
          </h4>
          <ul className="mt-1 space-y-1">
            {group.rows.map((provider) => (
              <li
                key={provider.id}
                className={`rounded border border-line bg-card px-2 py-1 text-[10px] ${provider.active === false ? 'opacity-60' : ''}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-semibold text-ink">
                    {provider.first_name} {provider.last_name}
                    {provider.category === 'other' && provider.function_label
                      ? ` · ${provider.function_label}`
                      : ''}
                    {provider.active === false ? ' · inactive' : ''}
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => edit(provider)}
                      disabled={readOnly}
                      className="rounded border border-line px-1.5 py-0.5 text-[9px] text-ink disabled:opacity-40"
                    >
                      Edit
                    </button>
                    {provider.active !== false ? (
                      <button
                        type="button"
                        onClick={() => deactivate(provider)}
                        disabled={readOnly}
                        className="rounded border border-amber-800 px-1.5 py-0.5 text-[9px] text-amber-200 disabled:opacity-40"
                      >
                        Deactivate
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(provider)}
                      disabled={readOnly}
                      className="rounded border border-alert/60 px-1.5 py-0.5 text-[9px] text-alert-soft disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-muted">
                  {[provider.phone, provider.email, provider.address, provider.instagram]
                    .filter(Boolean)
                    .join(' · ') || 'No contact details'}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-muted">
                  {roleForCategory[provider.category]
                    ? `Role access: ${weddingRoles.has(roleForCategory[provider.category]) ? 'active' : 'none'}`
                    : 'Contact only — no app access'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {!readOnly ? (
        <form className="mt-3 grid gap-1.5 border-t border-line pt-2 sm:grid-cols-2" onSubmit={submit}>
          <label className="text-[9px] text-muted">
            Category
            <select
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              className="mt-0.5 w-full rounded border border-line-strong bg-page px-1.5 py-1 text-[10px] text-ink"
            >
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          {form.category === 'other' ? (
            <label className="text-[9px] text-muted">
              Function
              <input
                value={form.functionLabel}
                onChange={(event) => setForm((current) => ({ ...current, functionLabel: event.target.value }))}
                required
                maxLength={120}
                placeholder="Saxophonist"
                className="mt-0.5 w-full rounded border border-line-strong bg-page px-1.5 py-1 text-[10px] text-ink"
              />
            </label>
          ) : null}
          {form.category === 'dj' ? (
            <label className="text-[9px] text-muted">
              VIP DJ identity
              <select
                value={form.vipDjId}
                onChange={(event) => setForm((current) => ({ ...current, vipDjId: event.target.value }))}
                className="mt-0.5 w-full rounded border border-line-strong bg-page px-1.5 py-1 text-[10px] text-ink"
              >
                <option value="">Package default</option>
                {vipDjs.filter((dj) => dj.active !== false).map((dj) => (
                  <option key={dj.id} value={dj.id}>{dj.display_name}</option>
                ))}
              </select>
            </label>
          ) : null}
          {[
            ['firstName', 'First name', true],
            ['lastName', 'Last name', true],
            ['phone', 'Phone'],
            ['email', 'Email', false, 'email'],
            ['address', 'Address'],
            ['instagram', 'Instagram'],
          ].map(([field, label, required, type]) => (
            <label key={field} className="text-[9px] text-muted">
              {label}
              <input
                type={type ?? 'text'}
                value={form[field]}
                onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                required={Boolean(required)}
                maxLength={field === 'address' ? 300 : 200}
                className="mt-0.5 w-full rounded border border-line-strong bg-page px-1.5 py-1 text-[10px] text-ink"
              />
            </label>
          ))}
          <div className="flex items-end gap-1.5">
            <button
              type="submit"
              disabled={saving}
              className="rounded border border-brand-strong bg-brand/40 px-2 py-1 text-[10px] font-semibold text-ink disabled:opacity-40"
            >
              {saving ? 'Saving…' : form.id ? 'Save provider' : 'Add provider'}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={() => setForm(EMPTY_FORM)}
                className="rounded border border-line px-2 py-1 text-[10px] text-muted"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete service provider"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.first_name} ${deleteTarget.last_name}? This removes the contact record and revokes any linked role access. The provider history cannot be restored from the admin UI.`
            : ''
        }
        confirmLabel="Delete provider"
        tone="danger"
        requireText={
          deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}` : null
        }
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmRemove}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError('');
        }}
      />
    </details>
  );
}
