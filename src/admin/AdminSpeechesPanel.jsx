import { useMemo, useState } from 'react';
import {
  createSpeechDoc,
  deleteSpeech,
  getRevisionContext,
  listSpeeches,
  parseSpeechDoc,
  publishSpeech,
  renameSpeechDoc,
  restoreSpeech,
  setSpeechMode,
  upsertSpeechMetadata,
} from './adminApi';

const EMPTY_FORM = {
  speakerName: '',
  relationship: '',
  order: 1,
  speakerLanguage: 'PL',
  mcLanguage: 'FR',
  speakerAccess: true,
};

export default function AdminSpeechesPanel({ wedding, readOnly = false, onChanged }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('OFF');
  const [speeches, setSpeeches] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [live, setLive] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [previews, setPreviews] = useState({});
  const [progress, setProgress] = useState({});

  const disabled = readOnly || Boolean(wedding.archived_at);
  const liveSpeechId = live?.speech_id ?? null;
  const nextOrder = useMemo(
    () => Math.max(0, ...speeches.map((speech) => speech.sort_order ?? 0)) + 1,
    [speeches],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [context, result] = await Promise.all([
        getRevisionContext(wedding.wedding_id),
        listSpeeches(wedding.wedding_id),
      ]);
      setMode(context?.wedding?.cartridge?.speechMode ?? 'OFF');
      setSpeeches(result?.speeches ?? []);
      setRevisions(result?.revisions ?? []);
      setLogs(result?.logs ?? []);
      setLive(result?.live ?? null);
    } catch (err) {
      setError(err.message ?? 'Could not load speeches.');
    } finally {
      setLoading(false);
    }
  };

  const changeMode = async (nextMode) => {
    if (disabled) return;
    if (
      mode === 'COMPLEX' &&
      nextMode !== 'COMPLEX' &&
      !window.confirm(
        'Switch away from COMPLEX? Scripts and Doc links are dropped, speaker access is revoked, and Google Docs are left untouched.',
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setSpeechMode({ weddingId: wedding.wedding_id, mode: nextMode });
      setMode(nextMode);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message ?? 'Could not change the speech mode.');
    } finally {
      setBusy(false);
    }
  };

  const addSpeech = async (event) => {
    event.preventDefault();
    if (disabled) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'COMPLEX') {
        const speechId = `speech_${Date.now()}`;
        await createSpeechDoc({
          weddingId: wedding.wedding_id,
          weddingFolderId: wedding.drive_folder_id ?? wedding.driveFolderId ?? '',
          speechId,
          speakerName: form.speakerName,
          relationship: form.relationship,
          order: form.order,
          speakerLanguage: form.speakerLanguage,
          mcLanguage: form.mcLanguage,
          speakerAccess: form.speakerAccess,
        });
      } else if (mode === 'LIGHT') {
        await upsertSpeechMetadata({
          weddingId: wedding.wedding_id,
          speechId: `speech_${Date.now()}`,
          speakerName: form.speakerName,
          relationship: form.relationship,
          order: form.order,
        });
      } else {
        setError('Enable LIGHT or COMPLEX speech mode first.');
        return;
      }
      setForm({ ...EMPTY_FORM, order: nextOrder });
      setMessage('Speech added.');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message ?? 'Could not add the speech.');
    } finally {
      setBusy(false);
    }
  };

  const saveMetadata = async (speech) => {
    if (disabled || speech.id === liveSpeechId) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'COMPLEX' && speech.drive_doc_id) {
        await renameSpeechDoc({
          weddingId: wedding.wedding_id,
          speechId: speech.id,
          fileId: speech.drive_doc_id,
          order: speech.sort_order,
          speakerName: speech.speaker_name,
          relationship: speech.speaker_relationship,
        });
      } else {
        await upsertSpeechMetadata({
          weddingId: wedding.wedding_id,
          speechId: speech.id,
          speakerName: speech.speaker_name,
          relationship: speech.speaker_relationship,
          order: speech.sort_order,
        });
      }
      setMessage('Speech metadata saved.');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message ?? 'Could not save the speech.');
    } finally {
      setBusy(false);
    }
  };

  const removeSpeech = async (speech) => {
    if (disabled || speech.id === liveSpeechId) return;
    if (!window.confirm('Delete this speech record? The Google Doc stays untouched.')) return;
    setBusy(true);
    setError('');
    try {
      await deleteSpeech({ weddingId: wedding.wedding_id, speechId: speech.id });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message ?? 'Could not delete the speech.');
    } finally {
      setBusy(false);
    }
  };

  const parse = async (speech) => {
    if (disabled || !speech.drive_doc_id) return;
    setBusy(true);
    setError('');
    setProgress((current) => ({ ...current, [speech.id]: 'fetch' }));
    try {
      const result = await parseSpeechDoc({
        weddingId: wedding.wedding_id,
        speechId: speech.id,
        fileId: speech.drive_doc_id,
        speakerLanguage: speech.speaker_language,
        mcLanguage: speech.mc_language,
        order: speech.sort_order,
      });
      setProgress((current) => ({ ...current, [speech.id]: 'preview' }));
      setPreviews((current) => ({ ...current, [speech.id]: result }));
      await load();
    } catch (err) {
      setError(err.message ?? 'Could not parse the speech Doc.');
    } finally {
      setBusy(false);
    }
  };

  const publish = async (speech) => {
    const preview = previews[speech.id];
    if (!preview?.script) {
      setError('Parse the Doc and review the plaintext preview before publishing.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await publishSpeech({
        weddingId: wedding.wedding_id,
        speech: {
          id: speech.id,
          order: speech.sort_order,
          speaker: {
            name: speech.speaker_name,
            relationship: speech.speaker_relationship,
          },
          speakerLanguage: speech.speaker_language,
          mcLanguage: speech.mc_language,
          speakerAccess: speech.speaker_access,
          script: preview.script,
        },
      });
      setPreviews((current) => {
        const next = { ...current };
        delete next[speech.id];
        return next;
      });
      setMessage('Speech published. Previous revisions stay available.');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message ?? 'Could not publish the speech.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async (speech) => {
    const latest = revisions.find((revision) => revision.speechIds?.includes(speech.id));
    if (!latest) return;
    const value = window.prompt(`Restore ${speech.id} to revision`, String(latest.revision));
    if (!value) return;
    setBusy(true);
    try {
      await restoreSpeech({
        weddingId: wedding.wedding_id,
        speechId: speech.id,
        revision: Number(value),
      });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message ?? 'Could not restore the revision.');
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
        <span>Speeches · {mode}</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-line p-2">
          {loading ? <p className="text-[10px] text-muted">Loading speeches…</p> : null}

          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-mono uppercase text-muted">Mode</span>
            {['OFF', 'LIGHT', 'COMPLEX'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => changeMode(value)}
                disabled={busy || disabled || value === mode}
                className={`rounded border px-2 py-1 font-semibold ${
                  value === mode
                    ? 'border-brand-strong bg-brand/40 text-ink'
                    : 'border-line bg-page text-muted'
                } disabled:opacity-50`}
              >
                {value}
              </button>
            ))}
            {liveSpeechId ? (
              <span className="ml-auto rounded border border-amber-700 px-2 py-1 text-amber-200">
                LIVE · {liveSpeechId}
              </span>
            ) : null}
          </div>

          {mode === 'OFF' ? (
            <p className="rounded border border-line bg-card p-2 text-[10px] text-muted">
              Speech management is disabled for this wedding. Choose LIGHT or COMPLEX to enable it.
            </p>
          ) : (
            <form onSubmit={addSpeech} className="grid gap-1.5 rounded border border-line bg-card p-2 sm:grid-cols-2">
              <input
                required
                aria-label="Speaker name"
                placeholder="Speaker name"
                value={form.speakerName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, speakerName: event.target.value }))
                }
                disabled={disabled}
                className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
              />
              <input
                aria-label="Relationship"
                placeholder="Relationship"
                value={form.relationship}
                onChange={(event) =>
                  setForm((current) => ({ ...current, relationship: event.target.value }))
                }
                disabled={disabled}
                className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
              />
              <input
                required
                type="number"
                min="1"
                aria-label="Order"
                value={form.order}
                onChange={(event) =>
                  setForm((current) => ({ ...current, order: Number(event.target.value) }))
                }
                disabled={disabled}
                className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
              />
              {mode === 'COMPLEX' ? (
                <>
                  <select
                    aria-label="Speaker language"
                    value={form.speakerLanguage}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, speakerLanguage: event.target.value }))
                    }
                    disabled={disabled}
                    className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
                  >
                    {['PL', 'EN', 'FR'].map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                  <select
                    aria-label="MC language"
                    value={form.mcLanguage}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, mcLanguage: event.target.value }))
                    }
                    disabled={disabled}
                    className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
                  >
                    {['PL', 'EN', 'FR'].map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-[10px] text-muted">
                    <input
                      type="checkbox"
                      checked={form.speakerAccess}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, speakerAccess: event.target.checked }))
                      }
                      disabled={disabled}
                    />
                    Speaker access
                  </label>
                </>
              ) : null}
              <button
                type="submit"
                disabled={busy || disabled}
                className="rounded border border-brand-strong bg-brand/30 px-2 py-1 text-[10px] font-bold text-brand-tint disabled:opacity-40 sm:col-span-2"
              >
                {mode === 'COMPLEX' ? 'Add speech + create Doc' : 'Add metadata-only speech'}
              </button>
            </form>
          )}

          {speeches.map((speech) => {
            const preview = previews[speech.id];
            const locked = speech.id === liveSpeechId;
            return (
              <div key={speech.id} className="rounded border border-line bg-card p-2">
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="font-heading text-xs font-semibold text-ink">
                    {speech.speaker_name}
                  </span>
                  <span className="font-mono text-[9px] text-muted">
                    {speech.id} · {speech.status}
                    {speech.live_revision ? ` · v${speech.live_revision}` : ''}
                  </span>
                </div>
                <div className="mt-1 grid gap-1 sm:grid-cols-3">
                  <input
                    aria-label={`Order for ${speech.id}`}
                    type="number"
                    min="1"
                    value={speech.sort_order}
                    onChange={(event) =>
                      setSpeeches((current) =>
                        current.map((row) =>
                          row.id === speech.id
                            ? { ...row, sort_order: Number(event.target.value) }
                            : row,
                        ),
                      )
                    }
                    disabled={disabled || locked}
                    className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
                  />
                  <input
                    aria-label={`Speaker for ${speech.id}`}
                    value={speech.speaker_name}
                    onChange={(event) =>
                      setSpeeches((current) =>
                        current.map((row) =>
                          row.id === speech.id
                            ? { ...row, speaker_name: event.target.value }
                            : row,
                        ),
                      )
                    }
                    disabled={disabled || locked}
                    className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
                  />
                  <input
                    aria-label={`Relationship for ${speech.id}`}
                    value={speech.speaker_relationship ?? ''}
                    onChange={(event) =>
                      setSpeeches((current) =>
                        current.map((row) =>
                          row.id === speech.id
                            ? { ...row, speaker_relationship: event.target.value }
                            : row,
                        ),
                      )
                    }
                    disabled={disabled || locked}
                    className="rounded border border-line bg-page px-2 py-1 text-[10px] text-ink"
                  />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => saveMetadata(speech)}
                    disabled={busy || disabled || locked}
                    className="rounded border border-line-strong px-2 py-1 font-semibold text-ink disabled:opacity-40"
                  >
                    Save metadata
                  </button>
                  {mode === 'COMPLEX' ? (
                    <>
                      {speech.drive_doc_url ? (
                        <a
                          href={speech.drive_doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-line px-2 py-1 text-brand-soft"
                        >
                          Open Doc
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => parse(speech)}
                        disabled={busy || disabled || !speech.drive_doc_id}
                        className="rounded border border-brand-strong bg-brand/30 px-2 py-1 font-semibold text-brand-tint disabled:opacity-40"
                      >
                        Parse Doc
                      </button>
                      <button
                        type="button"
                        onClick={() => publish(speech)}
                        disabled={busy || disabled || !preview?.script || locked}
                        className="rounded border border-brand-strong bg-brand/40 px-2 py-1 font-semibold text-ink disabled:opacity-40"
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => restore(speech)}
                        disabled={busy || disabled || locked}
                        className="rounded border border-line px-2 py-1 text-muted disabled:opacity-40"
                      >
                        Restore revision
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeSpeech(speech)}
                    disabled={busy || disabled || locked}
                    className="rounded border border-alert/60 px-2 py-1 text-alert-soft disabled:opacity-40"
                  >
                    Delete
                  </button>
                  {progress[speech.id] ? (
                    <span className="font-mono text-[9px] text-muted">
                      {progress[speech.id]}
                    </span>
                  ) : null}
                </div>
                {preview?.script ? (
                  <div className="mt-1 grid gap-1 lg:grid-cols-2">
                    <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded bg-page p-2 font-mono text-[10px] text-muted">
                      {preview.script}
                    </pre>
                    <div className="rounded border border-line bg-page p-2 text-[10px] text-muted">
                      <p className="font-semibold text-ink">Speaker preview</p>
                      <p className="mt-1 whitespace-pre-wrap">{preview.pairs?.[0]?.speaker}</p>
                      <p className="mt-2 font-semibold text-ink">MC preview</p>
                      <p className="mt-1 whitespace-pre-wrap">{preview.pairs?.[0]?.translation}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          <details className="rounded border border-line bg-card p-2 text-[10px] text-muted">
            <summary className="cursor-pointer font-semibold text-ink">
              Admin logs · 90 days
            </summary>
            <ul className="mt-1 space-y-0.5 font-mono text-[9px]">
              {logs.map((log) => (
                <li key={log.id}>
                  {log.created_at} · {log.action} · {log.doc_id ?? '—'} ·{' '}
                  {log.error_code ?? 'ok'}
                </li>
              ))}
            </ul>
          </details>

          {message ? <p className="text-[10px] text-emerald-300">{message}</p> : null}
          {error ? (
            <pre className="whitespace-pre-wrap rounded bg-alert/10 p-2 text-[10px] text-alert-soft">
              {error}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
