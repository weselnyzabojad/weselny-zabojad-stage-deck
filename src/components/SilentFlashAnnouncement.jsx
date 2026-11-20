import { useI18n } from '../i18n/useI18n';

// Screen-reader announcement for a Silent Flash (issue #1156). It reuses the
// schedule-change copy so the flash never duplicates translations across three
// locales. Visually hidden, polite and atomic; it disappears with the glow.
export default function SilentFlashAnnouncement({ change }) {
  const { t } = useI18n();
  if (!change) return null;

  const author =
    change.authorRole === 'venue_manager'
      ? t('scheduleChange.author.venueManager')
      : t('scheduleChange.author.mc');
  const body = t('scheduleChange.body', {
    author,
    step: change.stepTitle || change.stepId || t('scheduleChange.unknownStep'),
    from: change.from || t('scheduleChange.unknownTime'),
    to: change.to || t('scheduleChange.unknownTime'),
  });

  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {t('scheduleChange.title')}. {body}
    </p>
  );
}
