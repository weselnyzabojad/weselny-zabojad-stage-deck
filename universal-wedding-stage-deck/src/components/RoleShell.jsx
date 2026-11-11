import { useI18n } from '../i18n/useI18n';
import useCompact from '../hooks/useCompact';
import { resolveSyncState } from '../lib/syncStatus';
import { topBarControl } from '../lib/topBarStyles';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import BottomNav from './BottomNav';
import CulturalRulesBar from './CulturalRulesBar';
import SpeechesChip from './SpeechesChip';
import TopBarCenterIdentity from './TopBarCenterIdentity';

/**
 * RoleShell — shared responsive shell for role views.
 *
 * On wide screens (≥640px) it is a pass-through: the view renders its own full
 * desktop layout untouched. On phones (<640px) it wraps the compact content in
 * a low-height header and the persistent bottom navigation bar.
 *
 * The pocket header keeps the role badge (which now carries the sync tone), the
 * single-cell language control and the theme switch. Identity, chips, view
 * switch and auth control are always visible; the date is hidden on pocket.
 */
export default function RoleShell({
  compact,
  children,
  role,
  wedding = null,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox,
  onToggleTheme,
  theme,
  culturalRules = null,
  oczepinyStatus = null,
  speeches = null,
  speechMode = null,
  activeSpeechId = null,
  viewSwitch = null,
  authControl = null,
}) {
  const { t, tp, formatTime } = useI18n();
  const mediaCompact = useCompact();
  const isCompact = compact === true || mediaCompact;

  // Wide/desktop: the view owns its full layout. Do not add chrome.
  if (!isCompact) {
    return <>{children}</>;
  }

  const syncState = resolveSyncState(
    { status: syncStatus, error: syncError, remoteUpdatedAt, outbox },
    { t, tp, formatTime },
  );
  const roleShort = t(`role.${role}.short`);

  return (
    <div className="font-body min-h-dvh flex flex-col bg-page text-ink">
      <header className="bg-card border-b border-line px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`${roleShort}. Sync: ${syncState.label}`}
              title={syncState.title}
              className={`rounded px-1.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${topBarControl(syncState.tone)}`}
            >
              {roleShort}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <LanguageToggle variant="cycle" />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
          </div>
        </div>

        <div className="mt-1.5 flex flex-col gap-1.5 border-t border-line pt-1.5">
          <TopBarCenterIdentity wedding={wedding} compact showDate={false} />
          <div className="flex flex-wrap items-center gap-1.5">
            {viewSwitch}
            {authControl}
          </div>
          {culturalRules || speechMode != null ? (
            <CulturalRulesBar
              rules={culturalRules ?? {}}
              oczepinyStatus={oczepinyStatus}
              compact
              showRules={Boolean(culturalRules)}
            >
              {speechMode != null ? (
                <SpeechesChip
                  mode={speechMode}
                  speeches={speeches ?? []}
                  activeSpeechId={activeSpeechId}
                  compact
                />
              ) : null}
            </CulturalRulesBar>
          ) : null}
        </div>
      </header>

      <main id="phone-main" className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {children}
      </main>

      <BottomNav role={role} isCompact />
    </div>
  );
}
