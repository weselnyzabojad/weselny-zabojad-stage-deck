import { useState } from 'react';
import { acknowledgeUpdate, isUpdateAcknowledged } from '../lib/mandatoryAck.js';
import { getDeviceId } from '../lib/deviceId.js';
import { useI18n } from '../i18n/useI18n.js';

const BANNER_ROLES = new Set(['dj', 'photo1', 'photo2', 'video']);

// Non-blocking schedule-change banner for the crew views that act after the MC
// changes a step time. It stays until dismissed and replaces any older notice.
export default function ScheduleChangeBanner({ weddingId, role, update }) {
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

  const change = update?.change;
  const acknowledged =
    Boolean(update?.updatedAt) && acknowledgedRevision === update.updatedAt;
  const isAuthorDevice =
    Boolean(update?.deviceId) && update.deviceId === getDeviceId();

  if (
    !update?.value ||
    !change ||
    change.kind !== 'reschedule' ||
    !BANNER_ROLES.has(role) ||
    acknowledged ||
    isAuthorDevice
  ) {
    return null;
  }

  const author =
    change.authorRole === 'venue_manager'
      ? t('scheduleChange.author.venueManager')
      : t('scheduleChange.author.mc');
  const from = change.from || t('scheduleChange.unknownTime');
  const to = change.to || t('scheduleChange.unknownTime');

  const dismiss = () => {
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
    <section
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="border-b border-line-strong bg-brand/15 px-3 py-2 text-ink shadow-sm sm:px-4"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
            {t('scheduleChange.title')}
          </div>
          <p className="text-xs leading-snug">
            {t('scheduleChange.body', {
              author,
              step: change.stepTitle || change.stepId || t('scheduleChange.unknownStep'),
              from,
              to,
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 shrink-0 rounded-lg border border-line-strong bg-card px-3 py-2 text-[11px] font-bold text-ink transition hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-soft"
        >
          {t('scheduleChange.dismiss')}
        </button>
      </div>
    </section>
  );
}
