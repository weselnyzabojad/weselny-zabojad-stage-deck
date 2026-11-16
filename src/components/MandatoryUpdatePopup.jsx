import { useState } from 'react';
import { resolveMandatoryConstraints } from '../lib/mandatorySteps.js';
import { acknowledgeUpdate, isUpdateAcknowledged } from '../lib/mandatoryAck.js';
import { useI18n } from '../i18n/useI18n.js';

export default function MandatoryUpdatePopup({ weddingId, role, update }) {
  const { t } = useI18n();
  const [acknowledgedRevision, setAcknowledgedRevision] = useState(() => {
    if (typeof window === 'undefined') return null;
    return isUpdateAcknowledged(window.localStorage, {
      weddingId,
      role,
      updatedAt: update?.updatedAt,
    })
      ? update?.updatedAt ?? null
      : null;
  });
  const acknowledged =
    Boolean(update?.updatedAt) && acknowledgedRevision === update.updatedAt;

  if (!update?.value || role !== 'mc' || acknowledged) return null;

  const constraints = resolveMandatoryConstraints({}, update);
  const rows = [];

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

  if (rows.length === 0) return null;

  const acknowledge = () => {
    if (typeof window !== 'undefined') {
      acknowledgeUpdate(window.localStorage, {
        weddingId,
        role,
        updatedAt: update.updatedAt,
      });
    }
    setAcknowledgedRevision(update.updatedAt ?? null);
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
