import logo from '../assets/img/logo.png';
import { useI18n } from '../i18n/useI18n';
import SyncStatusBadge from './SyncStatusBadge';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import BottomNav from './BottomNav';
import ChildrenExpectedBadge from './ChildrenExpectedBadge';
import CulturalRulesBar from './CulturalRulesBar';
import SpeechesChip from './SpeechesChip';
import TopBarClock from './TopBarClock';

/**
 * RoleShell — shared responsive shell for role views.
 *
 * On wide screens (≥640px) it is a pass-through: the view renders its own full
 * desktop layout untouched. On phones (<640px) it wraps the compact content in
 * a shared compact header (logo, role, clock, PIN, Sync, language, theme) and
 * the persistent bottom navigation bar.
 */
export default function RoleShell({
  compact,
  children,
  role,
  clock = null,
  pin = null,
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
  childrenExpected = false,
  childrenRole = null,
  allowMcChildren = false,
}) {
  const { t } = useI18n();
  const isCompact =
    compact === true ||
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 639px)').matches);

  // Wide/desktop: the view owns its full layout. Do not add chrome.
  if (!isCompact) {
    return <>{children}</>;
  }

  return (
    <div className="font-body min-h-screen flex flex-col bg-page text-slate-100">
      <header className="bg-card border-b border-line px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="flex items-center justify-center rounded-md bg-white px-1.5 py-0.5 shadow-sm">
              <img src={logo} alt="Weselny Żabojad" className="h-7 w-auto object-contain" />
            </div>
            <span className="rounded border border-line-strong bg-raised px-1.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
              {t(`role.${role}.short`)}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <TopBarClock clock={clock} className="text-base" />
            {pin ? (
              <span
                title="Paired room PIN"
                className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[9px] font-semibold text-slate-300"
              >
                PIN {pin}
              </span>
            ) : null}
            <SyncStatusBadge
              status={syncStatus}
              error={syncError}
              remoteUpdatedAt={remoteUpdatedAt}
              outbox={outbox}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {viewSwitch}
            {authControl}
          </div>
          <div className="flex items-center justify-center">
            {childrenExpected ? (
              <ChildrenExpectedBadge
                wedding={{ childrenExpected: true }}
                role={childrenRole ?? role}
                inline
                allowMc={allowMcChildren}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
          </div>
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
      </header>

      <main id="phone-main" className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {children}
      </main>

      <BottomNav role={role} isCompact />
    </div>
  );
}

