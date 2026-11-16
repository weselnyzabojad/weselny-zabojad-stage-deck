import ChildrenExpectedBadge from './ChildrenExpectedBadge';
import EndHoursCard from './EndHoursCard';
import RoleShell from './RoleShell';
import SecondaryControlBar from './SecondaryControlBar';
import SyncStatusBadge from './SyncStatusBadge';
import TimelineFocusStack from './TimelineFocusStack';
import TopBarCenterIdentity from './TopBarCenterIdentity';
import TopBarClock from './TopBarClock';
import TopBarRoleIdentity from './TopBarRoleIdentity';
import TopBarLogo from './TopBarLogo';
import TopBarShell from './TopBarShell';
import UtilityControlGroup from './UtilityControlGroup';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import SkipLink from './SkipLink';
import { useI18n } from '../i18n/useI18n';
import useCompact from '../hooks/useCompact';
import { instrumentLabel } from '../lib/instruments.js';

function windowLabel(startTime, endTime) {
  if (startTime && endTime) return `${startTime}–${endTime}`;
  return endTime || startTime || '—';
}

// Standalone musician view. It follows the same shell/layout shape as
// PhotographerView (top bar, secondary bar, shared timeline, footer) but is an
// intentional fork: photo-only blocks are absent and changes to the media view
// must not be copied here automatically.
// Read-only musician view (issue #992): the shared timeline, the musician's
// personal availability and the end-hour card. No step controls or VIP data.
export default function MusicianView({
  wedding,
  timeline = [],
  clock,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox = null,
  theme = 'night',
  onToggleTheme,
  musicianId = null,
  roomCode = null,
  pin = null,
}) {
  const { t, locale } = useI18n();
  const musicians = Array.isArray(wedding?.musicians?.items) ? wedding.musicians.items : [];
  const musician = musicians.find((item) => item.id === musicianId) ?? null;
  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const compact = useCompact();

  const body = (
    <div id="main-content" tabIndex={-1} className="space-y-4">
      <TimelineFocusStack entries={timeline} activeIndex={activeIndex} />

      {musician ? (
        <section
          aria-labelledby="musician-availability-title"
          data-testid="musician-availability"
          className="rounded-xl border border-line bg-card p-4 shadow-lg"
        >
          <h2
            id="musician-availability-title"
            className="font-heading text-xs font-bold uppercase tracking-widest text-ink"
          >
            {t('musician.availability')}
          </h2>
          {musician.endTime ? (
            <div className="mt-3 rounded-lg border border-brand-strong bg-brand/15 px-3 py-2">
              <div className="text-[9px] uppercase tracking-widest text-brand-soft">
                {t('musician.endHour')}
              </div>
              <div className="font-mono text-lg font-bold text-ink">
                {t('musician.until', { time: musician.endTime })}
              </div>
            </div>
          ) : null}
          <dl className="mt-3 grid gap-3 text-[11px] sm:grid-cols-2">
            <div>
              <dt className="uppercase tracking-wider text-muted">{t('musician.instrument')}</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {musician.instrument ? instrumentLabel(musician.instrument, locale) : '—'}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-muted">{t('musician.window')}</dt>
              <dd className="mt-0.5 font-mono font-semibold text-ink">
                {windowLabel(musician.startTime, musician.endTime)}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-muted">{t('musician.ceremony')}</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                {musician.ceremonyRequired
                  ? t('musician.ceremonyRequired')
                  : t('musician.noCeremony')}
              </dd>
            </div>
            {musician.notes ? (
              <div className="sm:col-span-2">
                <dt className="uppercase tracking-wider text-muted">{t('musician.notes')}</dt>
                <dd className="mt-0.5 text-ink">{musician.notes}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : (
        <p role="alert" className="rounded-xl border border-alert/50 bg-alert/10 p-4 text-xs text-alert-tint">
          {t('musician.accessUnavailable')}
        </p>
      )}

      <EndHoursCard wedding={wedding} />
    </div>
  );

  if (compact) {
    return (
      <RoleShell
        compact
        role="musician"
        clock={clock}
        pin={pin}
        wedding={wedding}
        syncStatus={syncStatus}
        syncError={syncError}
        remoteUpdatedAt={remoteUpdatedAt}
        outbox={outbox}
        onToggleTheme={onToggleTheme}
        theme={theme}
      >
        {body}
      </RoleShell>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink antialiased">
      <SkipLink />
      <TopBarShell
        left={(
          <>
            <TopBarLogo />
            <TopBarClock clock={clock} />
            <TopBarRoleIdentity role="musician" />
          </>
        )}
        center={<TopBarCenterIdentity wedding={wedding} />}
        right={null}
      />

      <SecondaryControlBar
        left={<SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />}
        center={<ChildrenExpectedBadge wedding={wedding} inline />}
        right={(
          <>
            <span className="font-mono text-[10px] text-muted">{roomCode ?? ''}</span>
            <UtilityControlGroup>
              <LanguageToggle variant="desktop" />
              <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="desktop" />
            </UtilityControlGroup>
          </>
        )}
      />

      <main className="flex-1 p-4">{body}</main>
      <footer className="border-t border-line bg-card px-4 py-2 text-center font-mono text-[11px] text-muted">
        {t('musician.readOnly')}
      </footer>
    </div>
  );
}
