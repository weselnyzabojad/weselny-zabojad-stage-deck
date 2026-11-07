import { useState } from 'react';
import { resolveMandatoryConstraints } from '../lib/mandatorySteps.js';

const CAKE_SERVICE_LABELS = {
  KITCHEN_RETURN: 'Kitchen return / plated pieces',
  CUT_IN_PLACE: 'Cut in place / guests come',
};

function ackKey(weddingId) {
  return `wzsd:mandatory-ack:${weddingId}`;
}

export default function MandatoryUpdatePopup({ weddingId, role, isVipDj = false, update }) {
  const [acknowledged, setAcknowledged] = useState(() => {
    if (typeof window === 'undefined' || !update?.updatedAt) return false;
    try {
      return window.localStorage.getItem(ackKey(weddingId)) === update.updatedAt;
    } catch {
      return false;
    }
  });

  if (!update?.value || role === 'venue_manager' || acknowledged) return null;

  const isMc = role === 'mc';
  const isDjVip = role === 'dj' && isVipDj;
  if (!isMc && !isDjVip) return null;

  const constraints = resolveMandatoryConstraints({}, update);
  const rows = [];

  if (constraints.firstGuestsArrival) {
    rows.push({
      id: 'arrival',
      label: 'First guests arrival',
      value: constraints.firstGuestsArrival,
    });
  }

  if (isMc && constraints.prestationReady) {
    rows.push({
      id: 'prestation',
      label: 'Prestation ready (derived)',
      value: constraints.prestationReady,
    });
  }

  if (isMc) {
    for (const service of constraints.kitchenServices) {
      rows.push({
        id: `kitchen_${service.key}`,
        label: `${service.label} · ${service.modeLabel}`,
        value: service.time,
      });
    }
    rows.push({
      id: 'cake',
      label: 'Cake service',
      value: CAKE_SERVICE_LABELS[constraints.cakeServiceMode] ?? constraints.cakeServiceMode,
    });
  }

  if (isDjVip) {
    if (constraints.closureTime) {
      rows.push({ id: 'closure', label: 'Wedding closure', value: constraints.closureTime });
    }
    if (constraints.closureExtensionAllowed) {
      rows.push({ id: 'extension', label: 'Closure extension', value: '+1h allowed' });
    }
    if (constraints.lastSong) {
      rows.push({ id: 'last_song', label: 'Last song', value: constraints.lastSong });
    }
  }

  if (rows.length === 0) return null;

  const acknowledge = () => {
    try {
      window.localStorage.setItem(ackKey(weddingId), update.updatedAt ?? '');
    } catch {
      // best effort
    }
    setAcknowledged(true);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mandatory-update-title"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4"
    >
      <section className="w-full max-w-md rounded-2xl border border-brand-strong bg-card p-5 shadow-2xl">
        <h2 id="mandatory-update-title" className="font-heading text-lg font-bold text-white">
          Venue Manager updated the plan
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Mandatory times or cake service changed. Please acknowledge.
        </p>
        <div className="mt-3 space-y-1 rounded-lg border border-line bg-page/70 p-3 font-mono text-[11px] text-slate-300">
          {rows.map((row) => (
            <div key={row.id}>
              {row.label}: {row.value ?? '—'}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={acknowledge}
            className="rounded-lg border border-brand-strong bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover"
          >
            Acknowledge
          </button>
        </div>
      </section>
    </div>
  );
}
