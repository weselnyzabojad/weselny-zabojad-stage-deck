import { useState } from 'react';
import { isValidHostKey, saveStoredHostKey } from '../lib/sensitiveNotes';

function ActionButton({ children, onClick, tone = 'neutral', disabled = false }) {
  const tones = {
    neutral: 'border-line bg-raised text-slate-200 hover:border-line-strong',
    brand: 'border-brand-strong bg-brand/30 text-brand-tint hover:bg-brand/50',
    danger: 'border-alert/60 bg-alert/20 text-alert-tint hover:bg-alert/30',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-2 py-1 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone] ?? tones.neutral}`}
    >
      {children}
    </button>
  );
}

// MC-only event administration: cartridge export, host-key handoff and the
// end-of-event wipe (D4 / TODO 1). Never rendered on DJ, Pocket or Photo views.
export default function EventAdminCard({
  wedding,
  isProduction = false,
  hostKey = null,
  sensitiveStatus = 'disabled',
  onWipe,
}) {
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(wedding, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${wedding?.weddingId ?? 'wedding'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      flash('Cartridge exported.');
    } catch {
      flash('Export failed — copy the cartridge manually.');
    }
  };

  const handleCopyKey = async () => {
    if (!hostKey) return;
    try {
      await navigator.clipboard.writeText(hostKey);
      flash('Host key copied. Keep it off shared devices.');
    } catch {
      flash('Copy failed — select the key manually.');
    }
  };

  const handleImportKey = () => {
    const value = window.prompt(
      'Paste the host key from the original MC device (base64, 32 bytes).',
    );
    if (!value) return;
    if (!isValidHostKey(value)) {
      flash('Invalid host key.');
      return;
    }
    if (saveStoredHostKey(value.trim())) {
      flash('Host key saved. Reloading…');
      window.setTimeout(() => window.location.reload(), 500);
    } else {
      flash('Could not save the host key on this device.');
    }
  };

  const handleWipe = async () => {
    const confirmed = window.confirm(
      'Wipe the cloud room and all local event data on this device? This cannot be undone.',
    );
    if (!confirmed || busy) return;

    setBusy(true);
    try {
      await onWipe();
    } catch (error) {
      setBusy(false);
      flash(error?.message ?? 'Wipe failed.');
    }
  };

  const keyStatus =
    sensitiveStatus === 'synced'
      ? 'Host key loaded · sensitive notes decrypted'
      : sensitiveStatus === 'locked'
        ? 'Host key missing — import it to unlock VIP notes and contacts'
        : sensitiveStatus === 'loading'
          ? 'Loading sensitive notes…'
          : sensitiveStatus === 'error'
            ? 'Sensitive notes unavailable'
            : 'Local mode — sensitive notes stay on this device';

  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
          🗄️ Event data
        </h2>
        <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
          MC only
        </span>
      </div>

      <p className="mt-1 text-[10px] leading-snug text-slate-500">
        {isProduction ? keyStatus : 'Local mode — export before clearing the device.'}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <ActionButton onClick={handleExport}>⬇ Export cartridge</ActionButton>
        {isProduction && hostKey ? (
          <ActionButton tone="brand" onClick={handleCopyKey}>
            Copy host key
          </ActionButton>
        ) : null}
        {isProduction ? (
          <ActionButton onClick={handleImportKey}>Import host key</ActionButton>
        ) : null}
        <ActionButton tone="danger" onClick={handleWipe} disabled={busy}>
          {busy ? 'Wiping…' : 'Wipe room & local data'}
        </ActionButton>
      </div>

      {notice ? (
        <p className="mt-2 text-[10px] text-brand-soft" aria-live="polite">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
