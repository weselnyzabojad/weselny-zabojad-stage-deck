import { useEffect, useMemo, useState } from 'react';
import { validateCartridge } from '../lib/cartridgeImporter';
import { buildSourceDoc, parseDriveFileId, sourceDocChanged } from '../lib/speechSource';
import { getRevisionContext, previewDriveSource, publishWedding } from './adminApi';

export default function AdminSpeechesPanel({ wedding, readOnly = false, onChanged }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cartridge, setCartridge] = useState(null);
  const [links, setLinks] = useState({});
  const [previews, setPreviews] = useState({});

  const speechList = useMemo(
    () => (Array.isArray(cartridge?.speeches) ? cartridge.speeches : []),
    [cartridge],
  );

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    getRevisionContext(wedding.wedding_id)
      .then((context) => {
        if (!active) return;
        const next = context?.wedding?.cartridge ?? null;
        setCartridge(next);
        const nextLinks = {};
        for (const speech of next?.speeches ?? []) {
          nextLinks[speech.id] = speech?.script?.sourceDoc?.url ?? '';
        }
        setLinks(nextLinks);
        setPreviews({});
      })
      .catch((err) => {
        if (active) setError(err.message ?? 'Could not load the cartridge.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, wedding.wedding_id]);

  const updateSpeech = (speechId, patch) => {
    setCartridge((current) => {
      if (!current) return current;
      return {
        ...current,
        speeches: current.speeches.map((speech) =>
          speech.id === speechId ? { ...speech, ...patch } : speech,
        ),
      };
    });
  };

  const updateSpeaker = (speech, patch) => {
    const speaker =
      typeof speech.speaker === 'string'
        ? { name: speech.speaker }
        : speech.speaker && typeof speech.speaker === 'object'
          ? speech.speaker
          : {};
    updateSpeech(speech.id, { speaker: { ...speaker, ...patch } });
  };

  const preview = async (speech) => {
    setError('');
    setMessage('');
    const fileId = parseDriveFileId(links[speech.id] ?? speech?.script?.sourceDoc?.url);
    if (!fileId) {
      setError('Paste a Google Docs link or a Drive file id.');
      return;
    }
    setBusy(true);
    try {
      const result = await previewDriveSource(fileId);
      setPreviews((current) => ({ ...current, [speech.id]: result }));
    } catch (err) {
      setError(err.message ?? 'Could not preview the Google Doc.');
    } finally {
      setBusy(false);
    }
  };

  const importText = (speech) => {
    const result = previews[speech.id];
    if (!result?.file) return;
    const existing = String(speech?.script?.text ?? '').trim();
    if (existing && !window.confirm('Replace the existing speech text with this Google Doc?')) {
      return;
    }
    const sourceDoc = buildSourceDoc(result.file, {
      url: links[speech.id] || speech?.script?.sourceDoc?.url,
      retrievedAt: result.retrievedAt,
    });
    updateSpeech(speech.id, {
      script: {
        ...(speech.script ?? {}),
        text: result.text,
        format: 'plain',
        ready: Boolean(String(result.text ?? '').trim()),
        source: 'GOOGLE_DRIVE',
        sourceDoc,
      },
    });
    setMessage(`Imported ${result.file.name ?? speech.id}.`);
  };

  const publish = async () => {
    if (!cartridge) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const validation = await validateCartridge(cartridge);
      if (!validation.valid) {
        setError(
          validation.errors
            .map((item) => `${item.location}: ${item.message}`)
            .join('\n'),
        );
        return;
      }
      await publishWedding({
        weddingId: wedding.wedding_id,
        couple: wedding.couple,
        date: wedding.date,
        expectedRevision: Number(wedding.cartridge_revision ?? 0),
        cartridge: validation.cartridge,
      });
      setMessage('Speech changes published.');
      onChanged?.();
    } catch (err) {
      setError(err.message ?? 'Could not publish the speech changes.');
    } finally {
      setBusy(false);
    }
  };

  const disabled = readOnly || Boolean(wedding.archived_at);

  return (
    <div className="mt-2 rounded border border-line bg-raised/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-left font-heading text-[10px] font-semibold uppercase tracking-widest text-muted"
      >
        <span>Speeches / Google Doc import</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-line p-2">
          {loading ? <p className="text-[10px] text-muted">Loading cartridge…</p> : null}
          {!loading && !cartridge ? (
            <p className="text-[10px] text-muted">
              No published cartridge found, or the admin API is in demo mode.
            </p>
          ) : null}

          {speechList.map((speech) => {
            const previewResult = previews[speech.id];
            const changed = previewResult?.file
              ? sourceDocChanged(speech?.script?.sourceDoc, previewResult.file)
              : false;
            return (
              <div key={speech.id} className="rounded border border-line bg-card p-2">
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="font-heading text-xs font-semibold text-ink">
                    {speech.speaker?.name ?? speech.id}
                  </span>
                  <span className="font-mono text-[9px] text-muted">{speech.id}</span>
                </div>
                <input
                  type="email"
                  value={speech.speaker?.email ?? ''}
                  onChange={(event) => updateSpeaker(speech, { email: event.target.value })}
                  placeholder="Speaker email (admin only)"
                  className="mt-1 w-full rounded border border-line bg-page px-2 py-1 font-mono text-[10px] text-ink"
                />
                <input
                  type="url"
                  value={links[speech.id] ?? ''}
                  onChange={(event) =>
                    setLinks((current) => ({ ...current, [speech.id]: event.target.value }))
                  }
                  placeholder="https://docs.google.com/document/d/…"
                  className="mt-1 w-full rounded border border-line bg-page px-2 py-1 font-mono text-[10px] text-ink"
                />
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => preview(speech)}
                    disabled={busy || disabled}
                    className="rounded border border-line-strong bg-raised px-2 py-1 font-semibold text-ink disabled:opacity-40"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => importText(speech)}
                    disabled={busy || disabled || !previewResult?.file}
                    className="rounded border border-brand-strong bg-brand/40 px-2 py-1 font-semibold text-ink disabled:opacity-40"
                  >
                    Import text
                  </button>
                  {previewResult?.file ? (
                    <span className="text-muted">
                      {previewResult.file.name ?? previewResult.file.id}
                      {changed ? ' · changed since last import' : ' · up to date'}
                    </span>
                  ) : null}
                </div>
                {previewResult?.text ? (
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-page p-2 font-mono text-[10px] text-muted">
                    {previewResult.text}
                  </pre>
                ) : null}
              </div>
            );
          })}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={publish}
              disabled={busy || disabled || !cartridge}
              className="rounded border border-brand-strong bg-brand/40 px-2 py-1 text-[10px] font-semibold text-ink disabled:opacity-40"
            >
              Publish speech changes
            </button>
            {message ? <span className="text-[10px] text-emerald-300">{message}</span> : null}
          </div>
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
