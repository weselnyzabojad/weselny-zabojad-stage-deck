import { useI18n } from '../i18n/useI18n';
import { resolveActiveAttractions } from '../lib/attractionReminders.js';

const TYPE_KEYS = {
  PHOTO_BOOTH: 'attraction.type.PHOTO_BOOTH',
  GUEST_BOOK: 'attraction.type.GUEST_BOOK',
  POLAROIDS: 'attraction.type.POLAROIDS',
  OTHER: 'attraction.type.OTHER',
};

function StateLine({ reminder, t }) {
  if (reminder.state === 'ANNOUNCE') {
    return (
      <>
        <strong>{t('attraction.announce')}</strong>
        {' · '}
        {t('attraction.startsIn', { minutes: reminder.minutes })}
      </>
    );
  }
  if (reminder.state === 'AVAILABLE') {
    return (
      <>
        <strong>{t('attraction.available')}</strong>
        {' · '}
        {t('attraction.availableUntil', { time: reminder.endAtLabel })}
        {' · '}
        {t('attraction.endsIn', { minutes: reminder.minutes })}
      </>
    );
  }
  if (reminder.state === 'UPCOMING') {
    return <>{t('attraction.upcoming', { time: reminder.startAtLabel })}</>;
  }
  return <>{t('attraction.scheduled')}</>;
}

// MC-only strip. It lives inside/above the current-step hero area and never
// changes the timeline or persists dismissal state.
export default function AttractionStrip({
  attractions = null,
  now = null,
  eventDateISO = null,
  timeZone = 'UTC',
  compact = false,
}) {
  const { t } = useI18n();
  const items = resolveActiveAttractions(attractions, { now, eventDateISO, timeZone });
  if (items.length === 0) return null;

  return (
    <section
      aria-label={t('attraction.heading')}
      className={`rounded-lg border border-line bg-page/70 ${compact ? 'p-2' : 'p-2.5'}`}
    >
      <h3 className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        ✨ {t('attraction.heading')}
      </h3>
      <ul className={`mt-1.5 grid gap-1.5 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
        {items.map((item) => {
          const tone =
            item.reminder.state === 'ANNOUNCE'
              ? 'border-amber-700/60 bg-amber-950/40 text-amber-100'
              : item.reminder.state === 'AVAILABLE'
                ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-100'
                : 'border-line bg-card/70 text-muted';
          return (
            <li key={item.id} className={`rounded border p-2 text-[11px] ${tone}`}>
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="font-heading text-xs font-semibold text-ink">{item.name}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider">
                  {t(TYPE_KEYS[item.type] ?? TYPE_KEYS.OTHER)}
                </span>
                <span className="font-mono text-[10px] text-ink">
                  {item.startTime}–{item.endTime}
                </span>
              </div>
              {item.location || item.provider ? (
                <p className="mt-0.5 text-[10px]">
                  {[item.location, item.provider].filter(Boolean).join(' · ')}
                </p>
              ) : null}
              <p
                className="mt-0.5 text-[10px]"
                role={item.reminder.state === 'ANNOUNCE' || item.reminder.state === 'AVAILABLE' ? 'status' : undefined}
                aria-live={item.reminder.state === 'ANNOUNCE' || item.reminder.state === 'AVAILABLE' ? 'polite' : undefined}
              >
                <StateLine
                  reminder={{
                    ...item.reminder,
                    startAtLabel: item.startTime,
                    endAtLabel: item.endTime,
                  }}
                  t={t}
                />
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
