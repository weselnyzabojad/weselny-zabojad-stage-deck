import { useState } from 'react';
import { updateWeddingIdentity, createWeddingTemplateDoc } from './adminApi';
import { ADMIN_BUTTON } from './adminUi';
import {
  TEMPLATE_PREREQUISITES,
  templateReadiness,
} from '../../supabase/functions/_shared/templateReadiness.js';

const ADMIN_DEMO = import.meta.env.DEV && import.meta.env.VITE_ADMIN_DEMO === '1';

const FIELD_LABELS = Object.freeze({
  bride_name: 'Bride first name',
  groom_name: 'Groom first name',
  venue_name: 'Venue name',
  venue_address: 'Venue address',
});

function initialValues(wedding) {
  return {
    bride: wedding?.bride_name ?? '',
    groom: wedding?.groom_name ?? '',
  };
}

export default function AdminWeddingIdentityEditor({
  wedding,
  readOnly = false,
  onSaved = () => {},
}) {
  const [values, setValues] = useState(() => initialValues(wedding));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [created, setCreated] = useState(() =>
    wedding?.template_doc_id
      ? {
          id: wedding.template_doc_id,
          url: `https://docs.google.com/document/d/${wedding.template_doc_id}/edit`,
        }
      : null,
  );

  const disabled = readOnly || ADMIN_DEMO || busy;
  const readiness = templateReadiness({
    ...wedding,
    bride_name: values.bride,
    groom_name: values.groom,
  });
  const existingDocId = created?.id ?? wedding?.template_doc_id ?? null;
  const canCreate = readiness.ready && !disabled && !createBusy && !existingDocId;

  const createTemplate = async () => {
    if (!canCreate) return;
    if (
      !window.confirm(
        'Create the client template? It can only be created once and cannot be overwritten.',
      )
    ) {
      return;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      const result = await createWeddingTemplateDoc({
        weddingId: wedding?.wedding_id,
        weddingFolderId: wedding?.drive_folder_id ?? wedding?.driveFolderId ?? '',
      });
      const file = result?.file ?? {};
      setCreated({
        id: file.id ?? null,
        name: file.name ?? null,
        url:
          file.url ??
          (file.id ? `https://docs.google.com/document/d/${file.id}/edit` : null),
      });
      await onSaved();
    } catch (err) {
      setCreateError(err);
    } finally {
      setCreateBusy(false);
    }
  };

  const update = (field) => (event) => {
    setSaved('');
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const reset = () => {
    setValues(initialValues(wedding));
    setError('');
    setSaved('');
  };

  const save = async (event) => {
    event.preventDefault();
    if (disabled) return;
    const bride = values.bride.trim();
    const groom = values.groom.trim();
    if (!bride || !groom) {
      setError('Bride and groom first names are required.');
      return;
    }
    if (bride.length > 80 || groom.length > 80) {
      setError('Bride and groom names must be 80 characters or fewer.');
      return;
    }
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const result = await updateWeddingIdentity({
        weddingId: wedding?.wedding_id,
        brideName: bride,
        groomName: groom,
      });
      const identity = result?.identity ?? {};
      setValues({
        bride: identity.brideName ?? bride,
        groom: identity.groomName ?? groom,
      });
      setSaved('Wedding names saved.');
      await onSaved();
    } catch (err) {
      setError(err.message ?? 'Could not save the wedding names.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby={`wedding-identity-${wedding?.wedding_id ?? 'wedding'}`}
      className="mt-3 rounded-lg border border-line bg-page/50 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4
            id={`wedding-identity-${wedding?.wedding_id ?? 'wedding'}`}
            className="font-heading text-[11px] font-bold uppercase tracking-widest text-ink"
          >
            Wedding identity
          </h4>
          <p className="mt-1 text-[10px] text-muted">
            The bride and groom first names appear in the generated client template. They are
            app-owned and never read from the wedding Doc.
          </p>
        </div>
        {readOnly ? (
          <span className="rounded border border-line bg-raised px-2 py-1 text-[9px] font-semibold text-muted">
            Editing is disabled while the admin is read-only or the wedding is archived.
          </span>
        ) : null}
        {ADMIN_DEMO ? (
          <span className="rounded border border-amber-700 bg-amber-950/50 px-2 py-1 text-[9px] font-semibold text-amber-200">
            Demo preview: identity edits are disabled.
          </span>
        ) : null}
      </div>

      <form onSubmit={save} className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          Bride first name
          <input
            value={values.bride}
            onChange={update('bride')}
            disabled={disabled}
            maxLength={80}
            className="mt-1 w-full rounded border border-line bg-card px-2.5 py-2 text-xs text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong disabled:opacity-60"
          />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          Groom first name
          <input
            value={values.groom}
            onChange={update('groom')}
            disabled={disabled}
            maxLength={80}
            className="mt-1 w-full rounded border border-line bg-card px-2.5 py-2 text-xs text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong disabled:opacity-60"
          />
        </label>

        <div className="sm:col-span-2">
          {error ? (
            <p role="alert" className="rounded border border-alert/60 bg-alert/15 px-2.5 py-2 text-[11px] text-alert-soft">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p role="status" className="rounded border border-emerald-800 bg-emerald-950/30 px-2.5 py-2 text-[11px] text-emerald-200">
              {saved}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="submit" disabled={disabled} className={ADMIN_BUTTON.primary}>
              {busy ? 'Saving...' : 'Save names'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={disabled}
              className={ADMIN_BUTTON.secondary}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      <div className="mt-3 rounded border border-line bg-card p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            Client template readiness
          </p>
          <span
            className={`rounded border px-2 py-1 text-[9px] font-semibold ${
              readiness.ready
                ? 'border-emerald-700 bg-emerald-950/30 text-emerald-200'
                : 'border-amber-700 bg-amber-950/30 text-amber-200'
            }`}
          >
            {readiness.ready ? 'Ready' : `${readiness.missing.length} missing`}
          </span>
        </div>
        <ul className="mt-2 space-y-1 text-[10px]">
          {TEMPLATE_PREREQUISITES.map((field) => {
            const missing = readiness.missing.includes(field);
            return (
              <li key={field} className={missing ? 'text-amber-200' : 'text-emerald-200'}>
                {missing ? 'Missing' : 'Ready'} - {FIELD_LABELS[field]}
              </li>
            );
          })}
        </ul>
        {createError ? (
          <div
            role="alert"
            className="mt-2 rounded border border-alert/60 bg-alert/15 px-2.5 py-2 text-[10px] text-alert-soft"
          >
            <p>{createError.message ?? 'The client template could not be created.'}</p>
            {createError.code === 'template_prerequisites_missing' &&
            Array.isArray(createError.missing) &&
            createError.missing.length > 0 ? (
              <ul className="mt-1 list-disc pl-4">
                {createError.missing.map((field) => (
                  <li key={field}>{FIELD_LABELS[field] ?? field}</li>
                ))}
              </ul>
            ) : null}
            {createError.code === 'template_doc_exists' && createError.fileId ? (
              <a
                className="mt-1 inline-block font-semibold underline"
                href={`https://docs.google.com/document/d/${createError.fileId}/edit`}
                target="_blank"
                rel="noreferrer"
              >
                Open the existing client template
              </a>
            ) : null}
          </div>
        ) : null}
        {existingDocId ? (
          <p className="mt-2 rounded border border-emerald-800 bg-emerald-950/30 px-2.5 py-2 text-[10px] text-emerald-200">
            Client template created.{' '}
            <a
              className="font-semibold underline"
              href={
                created?.url ?? `https://docs.google.com/document/d/${existingDocId}/edit`
              }
              target="_blank"
              rel="noreferrer"
            >
              Open {created?.name ?? 'the client template'}
            </a>
          </p>
        ) : null}
        <button
          type="button"
          onClick={createTemplate}
          disabled={!canCreate}
          className={`${ADMIN_BUTTON.secondary} mt-2 disabled:opacity-40`}
        >
          {createBusy ? 'Creating client template...' : 'Create client template'}
        </button>
        <p className="mt-1 text-[9px] text-muted">
          Creation happens once. The client template is never overwritten; a second request is
          rejected.
        </p>
        {!readiness.ready ? (
          <p className="mt-1 text-[9px] text-muted">
            Fill the missing fields above before creating the client template.
          </p>
        ) : null}
      </div>
    </section>
  );
}
