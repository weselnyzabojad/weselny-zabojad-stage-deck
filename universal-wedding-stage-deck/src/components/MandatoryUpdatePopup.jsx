import { useState } from 'react';
import { resolveMandatoryConstraints } from '../lib/mandatorySteps.js';
import { useI18n } from '../i18n/useI18n.js';

function ackKey(weddingId) {
  return `wzsd:mandatory-ack:${weddingId}`;
}

export default function MandatoryUpdatePopup({ weddingId, role, isVipDj = false, update }) {
  const { t } = useI18n();
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
      label: t('mandatory.firstArrival'),
      value: constraints.firstGuestsArrival,
    });
  }

  if (isMc && constraints.prestationReady) {
    rows.push({
      id: 'prestation',
      label: t('mandatory.prestation'),
      value: constraints.prestationReady,
    });
  }

  if (isMc) {
    for (const service of constraints.kitchenServices) {
      rows.push({
        id: `kitchen_${service.key}`,
        label: `${service.label} · ${t(`mandatory.serviceMode.${service.mode}`)}`,
        value: service.time,
      });
    }
    rows.push({
      id: 'cake',
      label: t('mandatoryUpdate.cakeService'),
      value: t(`mandatory.cakeMode.${constraints.cakeServiceMode}`),
    });
  }

  if (isDjVip) {
    if (constraints.closureTime) {
      rows.push({
        id: 'closure',
        label: t('mandatoryUpdate.closure'),
        value: constraints.closureTime,
      });
    }
    if (constraints.closureExtensionAllowed) {
      rows.push({
        id: 'extension',
        label: t('mandatoryUpdate.extension'),
        value: t('mandatoryUpdate.extensionValue'),
      });
    }
    if (constraints.lastSong) {
      rows.push({
        id: 'last_song',
        label: t('mandatoryUpdate.lastSong'),
        value: constraints.lastSong,
      });
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
      className="fixed inset-0 z-critical flex items-center justify-center bg-black/60 px-4"
    >
      <section className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-brand-strong bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:p-5">
        <h2 id="mandatory-update-title" className="font-heading text-lg font-bold text-ink">
          {t('mandatoryUpdate.title')}
        </h2>
        <p className="mt-1 text-xs text-muted">{t('mandatoryUpdate.description')}</p>
        <div className="mt-3 space-y-1 rounded-lg border border-line bg-page/70 p-3 font-mono text-[11px] text-ink">
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
            className="rounded-lg border border-brand-strong bg-brand px-4 py-2 text-xs font-bold text-on-accent hover:bg-brand-hover"
          >
            {t('mandatoryUpdate.acknowledge')}
          </button>
        </div>
      </section>
    </div>
  );
}
