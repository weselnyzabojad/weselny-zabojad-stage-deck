import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  checkDriveSource,
  getRevisionContext,
  listDriveSources,
  previewDriveSource,
  publishDriveRevision,
} from './adminApi';
import { summarizeCartridge, validateCartridge } from '../lib/cartridgeImporter';
import {
  parseGoogleDocTemplate,
  validateGoogleDocTemplate,
} from '../lib/googleDocTemplate';
import { diffCartridges } from '../lib/cartridgeDiff';

// Admin-only Google Drive browser and non-destructive preview (issue #169).
// Nothing here is rendered on a stage-role view. A validated JSON preview may
// be published as a new revision after diff review and fresh TOTP re-auth
// (issue #170); the server re-reads and binds the exact Drive version.
export default function AdminDrivePanel({
  weddings = [],
  onRequestMfa,
  onPublished,
  onNotify,
}) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [targetWeddingId, setTargetWeddingId] = useState('');
  const [context, setContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState('');

  const loadSources = useCallback(
    async ({ append = false } = {}) => {
      setLoading(true);
      setError('');
      try {
        const result = await listDriveSources({
          query,
          pageToken: append ? nextPageToken : null,
        });
        setFiles((current) => (append ? [...current, ...(result.files ?? [])] : result.files ?? []));
        setNextPageToken(result.nextPageToken ?? null);
      } catch (err) {
        setError(err.message ?? 'Could not list Google Drive sources.');
      } finally {
        setLoading(false);
      }
    },
    [nextPageToken, query],
  );

  useEffect(() => {
    void loadSources();
    // Initial admin-only listing; subsequent searches are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectFile = async (file) => {
    setSelectedId(file.id);
    setPreview({ file, loading: true });
    setPreviewLoading(true);
    setContext(null);
    setCheckResult(null);
    setPublishError('');
    try {
      const source = await previewDriveSource(file.id);
      let parsed;
      if (source.kind === 'json') {
        const cartridge = JSON.parse(source.text);
        const validation = await validateCartridge(cartridge);
        parsed = {
          kind: 'json',
          cartridge: validation.cartridge,
          validation,
          summary: validation.valid ? summarizeCartridge(validation.cartridge) : null,
        };
      } else {
        const document = parseGoogleDocTemplate(source.text);
        const validation = validateGoogleDocTemplate(document);
        parsed = {
          kind: 'google_doc',
          validation: {
            valid: validation.errors.length === 0,
            errors: validation.errors.map((message) => ({ location: '/', message })),
            warnings: validation.warnings,
          },
          summary: {
            sections: document.sections.map((section) => section.marker),
            required: document.sections.filter((section) => section.required).length,
          },
        };
      }
      setPreview({ ...source, ...parsed, loading: false });
    } catch (err) {
      setPreview({
        file,
        loading: false,
        validation: { valid: false, errors: [{ location: '/', message: err.message }] },
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!preview?.cartridge || !targetWeddingId) {
      setContext(null);
      return undefined;
    }
    let cancelled = false;
    setContextLoading(true);
    setPublishError('');
    getRevisionContext(targetWeddingId)
      .then((data) => {
        if (!cancelled) setContext(data);
      })
      .catch((err) => {
        if (!cancelled) setContext({ error: err.message });
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preview?.cartridge, targetWeddingId]);

  const targetWedding = weddings.find((wedding) => wedding.wedding_id === targetWeddingId) ?? null;
  const diff = useMemo(
    () =>
      context?.wedding?.cartridge && preview?.cartridge
        ? diffCartridges(context.wedding.cartridge, preview.cartridge, context.liveState)
        : null,
    [context, preview?.cartridge],
  );

  const handleCheckDrive = async () => {
    if (!preview?.file?.id) return;
    setCheckResult({ loading: true });
    try {
      const result = await checkDriveSource(preview.file.id, {
        expectedVersion: preview.file.version ?? '',
        expectedChecksum: preview.file.md5Checksum ?? '',
      });
      setCheckResult(result);
    } catch (err) {
      setCheckResult({ error: err.message });
    }
  };

  const publishNow = async () => {
    if (!targetWedding || !preview?.cartridge) return;
    setPublishBusy(true);
    setPublishError('');
    try {
      const result = await publishDriveRevision({
        weddingId: targetWedding.wedding_id,
        expectedRevision: Number(
          context?.wedding?.cartridge_revision ?? targetWedding.cartridge_revision ?? 0,
        ),
        fileId: preview.file.id,
        expectedVersion: preview.file.version ?? '',
        expectedChecksum: preview.file.md5Checksum ?? '',
        couple: targetWedding.couple,
        date: targetWedding.date,
      });
      onNotify?.(`Published revision ${result.cartridgeRevision} from Drive.`, 'success');
      onPublished?.(result);
      setPreview(null);
      setSelectedId(null);
      setContext(null);
      setTargetWeddingId('');
    } catch (err) {
      setPublishError(err.message ?? 'Could not publish the Drive revision.');
      if (err.status === 409) await selectFile(preview.file);
    } finally {
      setPublishBusy(false);
    }
  };

  const handlePublish = () => {
    if (!targetWedding || !diff || !preview?.validation?.valid) return;
    const impact = [];
    if (diff.impact.activeStepRemoved) impact.push('the current live step would disappear');
    if (diff.impact.activeSpeechRemoved) impact.push('the active speech would disappear');
    const warning = impact.length ? `\n\nWarning: ${impact.join(' and ')}.` : '';
    if (
      !window.confirm(
        `Publish a new revision for ${targetWedding.couple || targetWedding.wedding_id}?${warning}`,
      )
    ) {
      return;
    }
    if (onRequestMfa) onRequestMfa(publishNow);
    else void publishNow();
  };

  return (
    <section className="space-y-3 rounded-xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm font-bold text-white">Google Drive source</h2>
          <p className="mt-1 text-[10px] text-slate-400">
            Browse files shared with the service-account email. Preview only — publishing is a
            separate confirmed admin action.
          </p>
        </div>
        <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[9px] text-brand-tint">
          admin only
        </span>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void loadSources();
        }}
      >
        <label className="min-w-[12rem] flex-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Search shared sources
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="File or Doc name"
            className="mt-1 w-full rounded border border-line bg-page px-2.5 py-2 text-xs text-white"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-brand-strong bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search Drive'}
        </button>
      </form>

      {error ? (
        <p role="alert" className="rounded border border-alert/60 bg-alert/15 px-3 py-2 text-xs text-alert-soft">
          {error}
        </p>
      ) : null}

      {!loading && files.length === 0 && !error ? (
        <p className="rounded border border-dashed border-line bg-page px-3 py-4 text-center text-xs text-slate-400">
          No supported shared sources found. Share cartridge JSON files or Google Docs with the
          service-account email.
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="divide-y divide-line rounded border border-line">
          {files.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => void selectFile(file)}
                className={`min-w-0 flex-1 text-left ${selectedId === file.id ? 'text-brand-tint' : 'text-slate-200'}`}
              >
                <span className="block truncate text-xs font-semibold">{file.name ?? file.id}</span>
                <span className="mt-0.5 block font-mono text-[9px] text-slate-500">
                  {file.mimeType === 'application/vnd.google-apps.document' ? 'Google Doc' : 'JSON'}
                  {' · '}modified {file.modifiedTime ?? '—'}
                  {file.version ? ` · v${file.version}` : ''}
                  {file.size ? ` · ${file.size} B` : ''}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void selectFile(file)}
                disabled={previewLoading && selectedId === file.id}
                className="rounded border border-line-strong bg-raised px-2 py-1 text-[10px] font-semibold text-slate-200 disabled:opacity-50"
              >
                {previewLoading && selectedId === file.id ? 'Previewing…' : 'Preview'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {nextPageToken ? (
        <button
          type="button"
          onClick={() => void loadSources({ append: true })}
          disabled={loading}
          className="rounded border border-line-strong bg-raised px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-50"
        >
          Load more
        </button>
      ) : null}

      {preview ? (
        <div className="space-y-3 rounded border border-line bg-page p-3">
          <div>
            <h3 className="text-xs font-bold text-white">{preview.file?.name ?? 'Drive source'}</h3>
            <p className="mt-1 font-mono text-[9px] leading-relaxed text-slate-500">
              id {preview.file?.id ?? '—'} · {preview.kind ?? '—'}
              {preview.bytes != null ? ` · ${preview.bytes} B` : ''}
              {preview.retrievedAt ? ` · retrieved ${preview.retrievedAt}` : ''}
            </p>
          </div>

          {preview.loading ? (
            <p className="text-xs text-slate-400">Retrieving and parsing this source…</p>
          ) : (
            <>
              <p
                role="status"
                className={`rounded border px-3 py-2 text-xs ${
                  preview.validation?.valid
                    ? 'border-emerald-700 bg-emerald-950/50 text-emerald-200'
                    : 'border-alert/60 bg-alert/15 text-alert-soft'
                }`}
              >
                {preview.validation?.valid
                  ? `Source validates without errors${preview.summary?.stepCount != null ? ` · ${preview.summary.stepCount} steps` : ''}${preview.summary?.sections ? ` · ${preview.summary.sections.length} sections` : ''}.`
                  : `Preview has ${preview.validation?.errors?.length ?? 0} validation error(s).`}
              </p>

              {preview.summary?.couple ? (
                <dl className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 sm:grid-cols-4">
                  <div><dt className="text-slate-500">Couple</dt><dd>{preview.summary.couple}</dd></div>
                  <div><dt className="text-slate-500">Date</dt><dd>{preview.summary.date}</dd></div>
                  <div><dt className="text-slate-500">PIN</dt><dd>{preview.summary.syncPin}</dd></div>
                  <div><dt className="text-slate-500">Steps</dt><dd>{preview.summary.stepCount}</dd></div>
                </dl>
              ) : null}

              {preview.summary?.sections?.length ? (
                <p className="font-mono text-[9px] leading-relaxed text-slate-400">
                  {preview.summary.sections.join(' · ')}
                </p>
              ) : null}

              {preview.validation?.errors?.length ? (
                <ul className="max-h-40 space-y-1 overflow-auto text-[10px] text-alert-soft">
                  {preview.validation.errors.map((item, index) => (
                    <li key={`${item.location}-${index}`}>
                      <span className="font-mono text-slate-500">{item.location}</span> {item.message}
                    </li>
                  ))}
                </ul>
              ) : null}

              {preview.validation?.warnings?.length ? (
                <ul className="max-h-32 space-y-1 overflow-auto text-[10px] text-amber-200">
                  {preview.validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              ) : null}

              {preview.text ? (
                <details className="text-[10px] text-slate-400">
                  <summary className="cursor-pointer font-semibold text-slate-300">
                    Source text (transient)
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-card p-2 font-mono text-[9px]">
                    {preview.text}
                  </pre>
                </details>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => void handleCheckDrive()}
                  className="rounded border border-line-strong bg-raised px-2.5 py-1.5 text-[10px] font-semibold text-slate-200"
                >
                  Check Drive for changes
                </button>
                {checkResult?.loading ? (
                  <span className="text-[10px] text-slate-400">Checking metadata…</span>
                ) : null}
                {checkResult?.error ? (
                  <span role="alert" className="text-[10px] text-alert-soft">{checkResult.error}</span>
                ) : null}
                {checkResult && !checkResult.loading && !checkResult.error ? (
                  <span role="status" className={`text-[10px] ${checkResult.changed ? 'text-amber-200' : 'text-emerald-200'}`}>
                    {checkResult.changed
                      ? `Source changed (${checkResult.reason}). Preview again before publishing.`
                      : 'Source is unchanged since preview.'}
                  </span>
                ) : null}
              </div>

              {preview.kind === 'json' && preview.validation?.valid ? (
                <div className="space-y-3 border-t border-line pt-3">
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Publish as new revision to
                    <select
                      value={targetWeddingId}
                      onChange={(event) => setTargetWeddingId(event.target.value)}
                      className="mt-1 block w-full rounded border border-line bg-card px-2.5 py-2 text-xs text-white"
                    >
                      <option value="">Select a wedding…</option>
                      {weddings
                        .filter((wedding) => !wedding.archived_at)
                        .map((wedding) => (
                          <option key={wedding.wedding_id} value={wedding.wedding_id}>
                            {wedding.couple || wedding.wedding_id} · rev {Number(wedding.cartridge_revision ?? 0)}
                          </option>
                        ))}
                    </select>
                  </label>

                  {contextLoading ? (
                    <p className="text-[10px] text-slate-400">Loading current revision and diff…</p>
                  ) : null}
                  {context?.error ? (
                    <p role="alert" className="text-[10px] text-alert-soft">{context.error}</p>
                  ) : null}

                  {diff ? (
                    <div className="space-y-2 rounded border border-line bg-card p-3 text-[10px] text-slate-300">
                      <h4 className="text-xs font-bold text-white">Diff against current revision</h4>
                      <p className="font-mono text-[9px] text-slate-500">
                        current rev {Number(context?.wedding?.cartridge_revision ?? 0)} · identity changes:{' '}
                        {diff.identity.length ? diff.identity.join(', ') : 'none'}
                      </p>
                      <p>
                        Steps: +{diff.steps.added.length} / -{diff.steps.removed.length} / ~
                        {diff.steps.changed.length}
                        {diff.steps.added.length ? ` · added ${diff.steps.added.join(', ')}` : ''}
                        {diff.steps.removed.length ? ` · removed ${diff.steps.removed.join(', ')}` : ''}
                        {diff.steps.changed.length ? ` · changed ${diff.steps.changed.join(', ')}` : ''}
                      </p>
                      <p>
                        Speeches: +{diff.speeches.added.length} / -{diff.speeches.removed.length} / ~
                        {diff.speeches.changed.length}
                      </p>
                      <p>
                        Role visibility changes:{' '}
                        {diff.roleVisibility.length ? diff.roleVisibility.join(', ') : 'none'}
                      </p>
                      {diff.impact.activeStepRemoved || diff.impact.activeSpeechRemoved ? (
                        <p className="rounded border border-amber-700 bg-amber-950/50 px-2 py-1 text-amber-200">
                          {diff.impact.activeStepRemoved
                            ? `Current live step "${diff.impact.activeStepId}" would be removed. `
                            : ''}
                          {diff.impact.activeSpeechRemoved
                            ? `Active speech "${diff.impact.activeSpeechId}" would be removed.`
                            : ''}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {publishError ? (
                    <p role="alert" className="rounded border border-alert/60 bg-alert/15 px-3 py-2 text-xs text-alert-soft">
                      {publishError}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={!targetWedding || !diff || publishBusy}
                    className="rounded border border-brand-strong bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {publishBusy ? 'Publishing…' : 'Publish as new revision'}
                  </button>
                  <p className="text-[9px] text-slate-500">
                    Requires fresh TOTP re-authentication. The server re-reads the Drive file and
                    rejects it if the version/checksum changed after preview.
                  </p>
                </div>
              ) : null}

              {preview.kind === 'google_doc' ? (
                <p className="border-t border-line pt-3 text-[10px] text-slate-400">
                  Google Doc preview is read-only until the v1.2 cartridge mapping is approved.
                  Publish a cartridge JSON source to create a new revision.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
