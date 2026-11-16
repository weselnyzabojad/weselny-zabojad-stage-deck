import { useI18n } from '../i18n/useI18n.js';

const ROLE_KEYS = new Set(['MC', 'DJ', 'Musician', 'Speaker', 'Venue']);

// One expandable Ceremony-parts list per Ceremony step card. The sub-steps are
// informational only: they never become timeline cards or duration inputs.
// `detail` narrows the fields per role: full (MC/DJ VIP/Musician), media
// (time, title, music cue, role) and venue (time, title, role).
export default function CeremonySubSteps({ subSteps = [], detail = 'full' }) {
  const { t } = useI18n();
  const rows = Array.isArray(subSteps) ? subSteps.filter(Boolean) : [];
  if (rows.length === 0) return null;
  const showNotes = detail === 'full';
  const showMusicCue = detail === 'full' || detail === 'media';

  return (
    <details
      data-testid="ceremony-substeps"
      className="mt-2 rounded-lg border border-line/70 bg-page/40"
    >
      <summary className="cursor-pointer px-2.5 py-2 text-[11px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-soft">
        {t('ceremony.subSteps.title', { count: rows.length })}
      </summary>
      <ol
        aria-label={t('ceremony.subSteps.listLabel')}
        className="grid gap-1.5 px-2.5 pb-2.5"
      >
        {rows.map((item) => {
          const roleKey = ROLE_KEYS.has(item.responsibleRole)
            ? item.responsibleRole
            : null;
          return (
            <li
              key={item.id}
              className="rounded-md border border-line/60 bg-card/60 px-2 py-1.5"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {item.time ? (
                  <span className="font-mono text-[10px] font-semibold text-brand-soft">
                    {item.time}
                  </span>
                ) : null}
                <span className="text-[11px] font-semibold text-ink">{item.title}</span>
                {roleKey ? (
                  <span className="rounded-full border border-line-strong bg-raised px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted">
                    {t(`ceremony.subSteps.role.${roleKey}`)}
                  </span>
                ) : null}
              </div>
              {showNotes && item.notes ? (
                <p className="mt-0.5 text-[10px] leading-snug text-muted">{item.notes}</p>
              ) : null}
              {showMusicCue && item.musicCue ? (
                <p className="mt-0.5 text-[10px] text-muted">
                  <span className="uppercase tracking-wider">
                    {t('ceremony.subSteps.musicCue')}:
                  </span>{' '}
                  {item.musicCue}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
