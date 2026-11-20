import { useCallback, useEffect, useState } from 'react';
import {
  deactivateMusician,
  deleteMusician,
  listMusicians,
  upsertMusician,
} from './adminApi';
import { AdminConfirmDialog } from './AdminDialogs';
import AdminQrCards from './AdminQrCards';
import { buildMusicianLink } from './adminUtils';
import { ADMIN_BUTTON } from './adminUi';
import { INSTRUMENTS, instrumentChoice, instrumentLabel } from '../lib/instruments.js';

const EMPTY_FORM = {
  id: null,
  name: '',
  instrument: '',
  startTime: '',
  endTime: '',
  ceremonyRequired: false,
  notes: '',
  active: true,
};

function availability(musician) {
  if (!musician.start_time || !musician.end_time) return 'Not specified';
  return `${musician.start_time}–${musician.end_time}`;
}

// Per-wedding musician registry (issue #990). The Doc only supplies
// `musicians.expected`; every detail here is owner-managed and snapshotted into
// the cartridge at publish time.
export default function AdminMusicians({ wedding, readOnly = false, onChanged = null }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [musicians, setMusicians] = useState([]);
  const [expected, setExpected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pinNotice, setPinNotice] = useState('');
  const [qrMusician, setQrMusician] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listMusicians(wedding.wedding_id);
      setMusicians(result.musicians ?? []);
      setExpected(result.expected === true);
      setLoaded(true);
    } catch (cause) {
      setError(cause?.message ?? 'Could not load musicians.');
    } finally {
      setLoading(false);
    }
  }, [wedding.wedding_id]);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- load() sets its loading flag before the request
    if (open && !loaded && !loading) void load();
  }, [open, loaded, loading, load]);

  const edit = (musician) => {
    setForm({
      id: musician.id,
      name: musician.name ?? '',
      instrument: musician.instrument ?? '',
      startTime: musician.start_time ?? '',
      endTime: musician.end_time ?? '',
      ceremonyRequired: musician.ceremony_required === true,
      notes: musician.notes ?? '',
      active: musician.active !== false,
    });
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.instrument.trim()) {
      setError('Name and instrument are required.');
      return;
    }
    setSaving(true);
    try {
      const result = await upsertMusician({
        weddingId: wedding.wedding_id,
        ...form,
      });
      if (result?.pin) {
        setPinNotice(
          `${result.musician?.name ?? form.name} PIN: ${result.pin} — shown once.`,
        );
      }
      setForm(EMPTY_FORM);
      await load();
      onChanged?.();
    } catch (cause) {
      setError(cause?.message ?? 'Could not save the musician.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (musician) => {
    setError('');
    try {
      await deactivateMusician(wedding.wedding_id, musician.id);
      await load();
      onChanged?.();
    } catch (cause) {
      setError(cause?.message ?? 'Could not deactivate the musician.');
    }
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteMusician(wedding.wedding_id, deleteTarget.id);
      setDeleteTarget(null);
      await load();
      onChanged?.();
    } catch (cause) {
      setDeleteError(cause?.message ?? 'Could not delete the musician.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <details
      className="mt-2 rounded-lg border border-line bg-page/50 p-2"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        Musicians
        {readOnly ? ' — read-only' : ''}
      </summary>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
        <span
          className={`rounded border px-1.5 py-0.5 font-semibold ${
            expected
              ? 'border-brand-strong bg-brand/20 text-brand-tint'
              : 'border-line bg-raised text-muted'
          }`}
        >
          {expected ? 'Doc expects a musician' : 'No musician expected in Doc'}
        </span>
        <span className="font-mono text-[9px] text-muted">
          {musicians.filter((musician) => musician.active !== false).length} active /{' '}
          {musicians.length} total
        </span>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className={`${ADMIN_BUTTON.secondary} ml-auto px-1.5 py-0.5 text-[9px]`}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 rounded border border-alert/60 bg-alert/15 px-2 py-1 text-[10px] text-alert-soft">
          {error}
        </p>
      ) : null}
      {pinNotice ? (
        <p role="status" className="mt-2 rounded border border-emerald-700 bg-emerald-950/40 px-2 py-1 text-[10px] text-emerald-200">
          {pinNotice}
        </p>
      ) : null}

      {!loading && musicians.length === 0 ? (
        <p className="mt-2 text-[10px] text-muted">No musicians recorded yet.</p>
      ) : null}

      {musicians.length > 0 ? (
        <div className="mt-2 overflow-x-auto rounded border border-line">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-page/60 text-[9px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-2 py-1.5">Musician</th>
                <th className="px-2 py-1.5">Instrument</th>
                <th className="px-2 py-1.5">Availability</th>
                <th className="px-2 py-1.5">Ceremony</th>
                <th className="px-2 py-1.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {musicians.map((musician) => (
                <tr
                  key={musician.id}
                  className={`border-t border-line/70 ${musician.active === false ? 'opacity-60' : ''}`}
                >
                  <td className="px-2 py-1.5 font-semibold text-ink">
                    {musician.name}
                    {musician.active === false ? ' — inactive' : ''}
                  </td>
                  <td className="px-2 py-1.5 text-muted">
                    {instrumentLabel(musician.instrument, 'en')}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-[9px] text-muted">
                    {availability(musician)}
                  </td>
                  <td className="px-2 py-1.5 text-muted">
                    {musician.ceremony_required ? 'Required' : 'No'}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => edit(musician)}
                        disabled={readOnly}
                        className={`${ADMIN_BUTTON.ghost} px-1.5 py-0.5 text-[9px]`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrMusician(musician)}
                        disabled={!wedding.room_code}
                        className={`${ADMIN_BUTTON.secondary} px-1.5 py-0.5 text-[9px]`}
                      >
                        QR
                      </button>
                      {musician.active !== false ? (
                        <button
                          type="button"
                          onClick={() => void deactivate(musician)}
                          disabled={readOnly}
                          className={`${ADMIN_BUTTON.secondary} px-1.5 py-0.5 text-[9px]`}
                        >
                          Deactivate
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError('');
                          setDeleteTarget(musician);
                        }}
                        disabled={readOnly}
                        className={`${ADMIN_BUTTON.danger} px-1.5 py-0.5 text-[9px]`}
                      >
                        Delete
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!readOnly ? (
        <form className="mt-3 grid gap-1.5 border-t border-line pt-2 sm:grid-cols-2" onSubmit={submit}>
          <label className="text-[9px] text-muted">
            Musician name
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              maxLength={120}
              className="mt-0.5 w-full rounded border border-line-strong bg-page px-1.5 py-1 text-[10px] text-ink"
            />
          </label>
          <label className="text-[9px] text-muted">
            Instrument
            <select
              value={instrumentChoice(form.instrument)}
              onChange={(event) => {
                const key = event.target.value;
                setForm((current) => ({
                  ...current,
                  instrument: key === 'other' ? '' : key,
                }));
              }}
              required
              className="mt-0.5 w-full rounded border border-line-strong bg-page px-1.5 py-1 text-[10px] text-ink"
            >
              {INSTRUMENTS.map((instrument) => (
                <option key={instrument.key} value={instrument.key}>
                  {instrument.labels.en}
                </option>
              ))}
            </select>
            {instrumentChoice(form.instrument) === 'other' ? (
              <input
                value={form.instrument}
                onChange={(event) =>
                  setForm((current) => ({ ...current, instrument: event.target.value }))
                }
                placeholder="Instrument name"
                required
                maxLength={120}
                className="mt-1 w-full rounded border border-line-strong bg-page px-1.5 py-1 text-[10px] text-ink"
              />
            ) : null}
          </label>
          <label className="text-[9px] text-muted">
            Start time
            <input
              type="time"
              value={form.startTime}
              onChange={(event) =>
                setForm((current) => ({ ...current, startTime: event.target.value }))
              }
              className="mt-0.5 w-full rounded border border-line-strong bg-page px-1.5 py-1 font-mono text-[10px] text-ink"
            />
          </label>
          <label className="text-[9px] text-muted">
            End time
            <input
              type="time"
              value={form.endTime}
              onChange={(event) =>
                setForm((current) => ({ ...current, endTime: event.target.value }))
              }
              className="mt-0.5 w-full rounded border border-line-strong bg-page px-1.5 py-1 font-mono text-[10px] text-ink"
            />
          </label>
          <label className="flex items-center gap-2 text-[10px] text-muted">
            <input
              type="checkbox"
              checked={form.ceremonyRequired}
              onChange={(event) =>
                setForm((current) => ({ ...current, ceremonyRequired: event.target.checked }))
              }
              className="h-4 w-4"
            />
            Ceremony required
          </label>
          <label className="flex items-center gap-2 text-[10px] text-muted">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm((current) => ({ ...current, active: event.target.checked }))
              }
              className="h-4 w-4"
            />
            Active
          </label>
          <label className="text-[9px] text-muted sm:col-span-2">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              maxLength={500}
              rows={2}
              className="mt-0.5 w-full rounded border border-line-strong bg-page px-1.5 py-1 text-[10px] text-ink"
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className={`${ADMIN_BUTTON.primary} px-2 py-1 text-[10px]`}
            >
              {saving ? 'Saving…' : form.id ? 'Save musician' : 'Add musician'}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={() => setForm(EMPTY_FORM)}
                className={`${ADMIN_BUTTON.secondary} px-2 py-1 text-[10px]`}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {qrMusician ? (
        <div className="fixed inset-0 z-modal flex items-start justify-center overflow-y-auto bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-heading text-sm font-bold text-ink">Musician QR</h3>
              <button
                type="button"
                onClick={() => setQrMusician(null)}
                className={`${ADMIN_BUTTON.secondary} px-2 py-1 text-[10px]`}
              >
                Close
              </button>
            </div>
            <div className="mt-3">
              <AdminQrCards
                cards={[
                  {
                    role: `musician-${qrMusician.id}`,
                    label: `${qrMusician.name} - ${instrumentLabel(qrMusician.instrument, 'en')}`,
                    url: buildMusicianLink(
                      'https://deck.weselnyzabojad.pl',
                      wedding.room_code,
                      qrMusician.id,
                    ),
                    roomCode: wedding.room_code,
                    couple: wedding.couple,
                    date: wedding.date,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      ) : null}

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete musician"
        description={`Delete ${deleteTarget?.name ?? 'this musician'} from the registry? This cannot be undone.`}
        confirmLabel="Delete musician"
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmRemove}
      />
    </details>
  );
}
