import { useEffect, useMemo, useRef, useState } from 'react';
import promptText from '../../schema/ai-converter-prompt.md?raw';
import exampleCartridge from '../../schema/wedding-cartridge.example.json';
import {
  parseCartridgeJson,
  summarizeCartridge,
  validateCartridge,
} from '../lib/cartridgeImporter';
import { clearActiveCartridge, saveActiveCartridge } from '../lib/cartridgeStorage';
import ModalShell from './ModalShell';

async function writeClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(area);
  return copied;
}

export default function CartridgeImporter({ open, onClose, currentCartridge }) {
  const [notes, setNotes] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [errors, setErrors] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState('');
  const copyTimer = useRef(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const promptWithNotes = useMemo(() => {
    const trimmed = notes.trim();
    if (!trimmed) return promptText;
    const marker = '<<<PASTE THE RAW GOOGLE DOC / WEDDING NOTES HERE>>>';
    return promptText.includes(marker)
      ? promptText.replace(marker, trimmed)
      : `${promptText}\n\n--- RAW WEDDING NOTES ---\n${trimmed}`;
  }, [notes]);

  const copy = async (text, label) => {
    const copied = await writeClipboard(text);
    setCopyState(copied ? `${label} copied to clipboard.` : 'Copy failed — select and copy manually.');
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState(''), 3000);
  };

  const validate = async () => {
    setErrors([]);
    setPreview(null);
    const parsed = parseCartridgeJson(jsonText);
    if (!parsed.ok) {
      setErrors([{ location: 'JSON', message: parsed.error }]);
      return;
    }

    setBusy(true);
    const result = await validateCartridge(parsed.value);
    setBusy(false);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setPreview(parsed.value);
  };

  const importCartridge = () => {
    if (!preview) return;
    if (!saveActiveCartridge(preview)) {
      setErrors([
        { location: 'storage', message: 'Could not save the cartridge on this device.' },
      ]);
      return;
    }
    setBusy(true);
    window.location.reload();
  };

  const resetDemo = () => {
    const confirmed = window.confirm(
      'Remove the imported cartridge and return to the built-in demo wedding?',
    );
    if (!confirmed) return;
    clearActiveCartridge();
    window.location.reload();
  };

  const loadExample = () => {
    setJsonText(JSON.stringify(exampleCartridge, null, 2));
    setErrors([]);
    setPreview(null);
  };

  const summary = preview ? summarizeCartridge(preview) : null;
  const current = summarizeCartridge(currentCartridge);

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="cartridge-importer-title" size="full">
      <header className="border-b border-[#1c2a52] bg-[#0b132b] px-5 py-3 pr-16">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="cartridge-importer-title"
              className="font-heading text-lg font-bold text-white"
            >
              📥 Cartridge Importer
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Convert raw Google Docs with the AI prompt, then paste the generated
              WeddingSchema v1.1 JSON here.
            </p>
          </div>
          <span className="rounded border border-[#2b3d73] bg-[#111d3b] px-2 py-1 font-mono text-[10px] text-slate-300">
            Current: {current.couple} · PIN {current.syncPin}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="flex flex-col rounded-xl border border-[#1c2a52] bg-[#0b132b]/95 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
                1. AI Converter Prompt
              </h3>
              <span className="rounded border border-[#2b3d73] bg-[#111d3b] px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                v1.1
              </span>
            </div>

            <p className="mt-2 text-xs leading-snug text-slate-400">
              Paste the raw harmonogram / notes below, then copy the combined
              prompt into your AI. The AI should return only the JSON cartridge.
            </p>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Paste raw Google Doc notes, timeline skeleton, vendor departures, games, cultural rules..."
              className="mt-2 min-h-36 w-full resize-y rounded-lg border border-[#1c2a52] bg-[#070b19] p-3 font-mono text-xs text-slate-200 outline-none focus:border-[#3b5bdb]"
            />

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copy(promptText, 'Prompt')}
                className="rounded-lg border border-[#2b3d73] bg-[#111d3b] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-[#1c2a52]"
              >
                Copy prompt
              </button>
              <button
                type="button"
                onClick={() => copy(promptWithNotes, 'Prompt + notes')}
                className="rounded-lg border border-[#3b5bdb] bg-[#002395]/40 px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#002395]/70"
              >
                Copy prompt + notes
              </button>
            </div>

            <details className="mt-3 rounded-lg border border-[#1c2a52] bg-[#070b19]/70 p-2">
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-300">
                View the converter prompt
              </summary>
              <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-slate-400">
                {promptText}
              </pre>
            </details>
          </section>

          <section className="flex flex-col rounded-xl border border-[#1c2a52] bg-[#0b132b]/95 p-4">
            <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
              2. Paste WeddingSchema JSON
            </h3>
            <p className="mt-2 text-xs leading-snug text-slate-400">
              Validate against the v1.1 schema, preview the cartridge, then import
              it. Importing reloads the app so the new wedding, PIN and timeline
              take effect.
            </p>

            <textarea
              value={jsonText}
              onChange={(event) => {
                setJsonText(event.target.value);
                setPreview(null);
                setErrors([]);
              }}
              placeholder='{ "schemaVersion": "1.1", ... }'
              spellCheck={false}
              className="mt-2 min-h-64 flex-1 resize-y rounded-lg border border-[#1c2a52] bg-[#070b19] p-3 font-mono text-xs text-slate-200 outline-none focus:border-[#3b5bdb]"
            />

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={validate}
                disabled={busy}
                className="rounded-lg border border-[#3b5bdb] bg-[#002395] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1a3cb0] disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? 'Validating…' : 'Validate JSON'}
              </button>
              <button
                type="button"
                onClick={loadExample}
                className="rounded-lg border border-[#2b3d73] bg-[#111d3b] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-[#1c2a52]"
              >
                Load example
              </button>
              <button
                type="button"
                onClick={() => {
                  setJsonText('');
                  setPreview(null);
                  setErrors([]);
                }}
                className="rounded-lg border border-[#2b3d73] bg-[#111d3b] px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-[#1c2a52]"
              >
                Clear
              </button>
            </div>

            {errors.length > 0 ? (
              <div
                role="alert"
                className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-[#ED2939]/60 bg-[#ED2939]/15 p-2.5"
              >
                <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-[#ff808a]">
                  Validation failed ({errors.length})
                </div>
                <ul className="mt-1 space-y-1 font-mono text-[10px] leading-snug text-[#ffb3ba]">
                  {errors.map((error, index) => (
                    <li key={`${error.location}-${index}`}>
                      <span className="text-slate-400">{error.location}</span> — {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {summary ? (
              <div className="mt-3 rounded-lg border border-emerald-800 bg-emerald-950/40 p-3">
                <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Ready to import
                </div>
                <div className="mt-1 text-sm font-heading font-bold text-white">
                  {summary.couple}
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  {summary.date} · PIN {summary.syncPin} · {summary.stepCount} steps ·{' '}
                  {summary.bufferCount} buffers · {summary.hardAnchorCount} anchors
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-400">
                  {summary.vipAlertCount} VIP alerts · {summary.jokerCount} jokers ·{' '}
                  {summary.preWeddingCount} pre-wedding tasks
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                  {summary.coHostCount} co-hosts · {summary.contentCreatorCount} content creators
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                  {summary.keySongCount} key songs (DJ Booth)
                </div>
                <button
                  type="button"
                  onClick={importCartridge}
                  disabled={busy}
                  className="mt-2 w-full rounded-lg border border-[#3b5bdb] bg-[#002395] px-3 py-2.5 text-xs font-heading font-bold text-white transition hover:bg-[#1a3cb0] disabled:opacity-60"
                >
                  Import & reload
                </button>
              </div>
            ) : null}
          </section>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1c2a52] bg-[#0b132b]/70 px-3 py-2">
          <span aria-live="polite" className="text-[11px] text-slate-400">
            {copyState || 'Imported cartridges replace the built-in demo on this device.'}
          </span>
          <button
            type="button"
            onClick={resetDemo}
            className="rounded border border-[#2b3d73] bg-[#111d3b] px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 transition hover:bg-[#1c2a52] hover:text-white"
          >
            Reset to built-in demo
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
