import logo from '../assets/img/logo.png';
import { useI18n } from '../i18n/useI18n';
import SyncStatusBadge from './SyncStatusBadge';
import RoleSwitcher from './RoleSwitcher';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import BottomNav from './BottomNav';

/**
 * RoleShell — shared responsive shell for role views.
 *
 * On wide screens (≥640px) it is a pass-through: the view renders its own full
 * desktop layout untouched. On phones (<640px) it wraps the compact content in
 * a minimal phone chrome — a slim header (logo, role, sync, language, theme)
 * and the shared persistent bottom navigation bar.
 *
 * Views pass `compact` (a boolean resolved from a matchMedia listener) and the
 * body content the phone should display. Role-specific phone actions are
 * forwarded to BottomNav.
 */
export default function RoleShell({
  compact,
  children,
  role,
  roles,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox,
  onToggleTheme,
  theme,
  onRoleChange,
  onUndo,
  canUndo,
  lastUndoLabel,
  onAdvance,
  isComplete,
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
      <header className="bg-card border-b border-line px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-md">
            <img src={logo} alt="Weselny Żabojad" className="h-8 w-auto object-contain" />
          </div>
          <span className="bg-raised px-2.5 py-1 rounded text-white font-mono font-semibold border border-line-strong text-xs uppercase tracking-wider">
            {t(`role.${role}.short`)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
          {roles && roles.length > 1 ? (
            <RoleSwitcher role={role} roles={roles} onChange={onRoleChange} />
          ) : null}
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
        </div>
      </header>

      <main id="phone-main" className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {children}
      </main>

      <BottomNav
        role={role}
        syncStatus={syncStatus}
        syncError={syncError}
        remoteUpdatedAt={remoteUpdatedAt}
        outbox={outbox}
        onToggleTheme={onToggleTheme}
        theme={theme}
        isCompact
        onUndo={onUndo}
        canUndo={canUndo}
        lastUndoLabel={lastUndoLabel}
        onAdvance={onAdvance}
        isComplete={isComplete}
      />
    </div>
  );
}
