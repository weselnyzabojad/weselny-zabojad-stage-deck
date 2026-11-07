import { useState } from 'react';

function ackKey(weddingId) {
  return `wzsd:mandatory-ack:${weddingId}`;
}

export default function MandatoryUpdatePopup({ weddingId, role, update }) {
  const [acknowledged, setAcknowledged] = useState(() => {
    if (typeof window === 'undefined' || !update?.updatedAt) return false;
    try {
      return window.localStorage.getItem(ackKey(weddingId)) === update.updatedAt;
    } catch {
      return false;
    }
  });

  if (!update?.value || role === 'venue_manager' || acknowledged) return null;
  const value = update.value;
  const kitchen = value.kitchenServices ?? {};

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
          <div>First guests arrival: {value.firstGuestsArrival ?? '—'}</div>
          <div>Obiad weselny: {kitchen.dinner ?? '—'}</div>
          <div>Pierwsza kolacja: {kitchen.firstSupper ?? '—'}</div>
          <div>Druga kolacja: {kitchen.secondSupper ?? '—'}</div>
          <div>Trzecia kolacja: {kitchen.thirdSupper || '—'}</div>
          <div>Cake service: {value.cakeServiceMode ?? 'KITCHEN_RETURN'}</div>
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
