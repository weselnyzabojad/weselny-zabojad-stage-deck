import SkipLink from './SkipLink';
import { useI18n } from '../i18n/useI18n';
import { CONTROL_BUTTON_BASE } from '../lib/styleConstants';
import HoldToConfirmButton from './HoldToConfirmButton';
import SyncStatusBadge from './SyncStatusBadge';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';

/**
 * BottomNav — persistent bottom navigation bar for phone layouts.
 *
 * Shows the current role, sync status, and role-appropriate actions:
 *   - MC: advance, undo, drift check
 *   - DJ/Photo/Speaker: read-only (no step controls)
 *
 * The bar is visible on small screens (via isCompact from RoleShell)
 * and hidden on wide (≥640px) layouts.
 *
 * Props from RoleShell:
 *  - role: current role string
 *  - syncStatus / syncError / remoteUpdatedAt / outbox: sync state
 *  - onToggleTheme / theme: theme management
 *  - isCompact: boolean, true when width < 640px
 *  - onUndo: () => void
 *  - canUndo: boolean
 *  - lastUndoLabel: string | null
 *  - onAdvance: () => void
 *  - isComplete: boolean
 */
export default function BottomNav({
  role,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox,
  onToggleTheme,
  theme,
  isCompact,
  onUndo,
  canUndo,
  lastUndoLabel,
  onAdvance,
  isComplete,
}) {
  const { t } = useI18n();

  // Only show on compact (phone) width
  if (!isCompact) return null;

  return (
    <footer className="bg-card border-t border-line px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs uppercase tracking-wider">
      <SkipLink />

      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-mono">
          {t('role.' + role + '.short')} {'·'}{' '}
        </span>
        <span className="font-mono text-slate-400">
          {t('role.' + role + '.label')}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
        <LanguageToggle />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
      </div>

      {/* Role-specific action buttons: MC gets undo/advance */}
      {role === 'mc' && onUndo != null && onAdvance != null && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title={canUndo ? `Undo: ${lastUndoLabel ?? 'last action'}` : "Nothing to undo"}
            className={`${CONTROL_BUTTON_BASE} ${!canUndo ? 'bg-card text-slate-600 border-line cursor-not-allowed' : 'bg-raised hover:bg-line text-slate-200 border-line-strong'}`}
          >
            ↩ Undo
          </button>
          <HoldToConfirmButton
            onConfirm={onAdvance}
            disabled={isComplete}
            label={isComplete ? "EVENT COMPLETE ✓" : "HOLD TO ADVANCE ➔"}
            holdLabel="hold 1.2s"
            className={`px-4 py-1.5 rounded text-sm font-bold transition border ${isComplete ? 'bg-card text-slate-500 border-line' : 'bg-brand hover:bg-brand-hover active:bg-brand-active text-white shadow-lg shadow-blue-950/60 border-brand-strong'}`}
          />
        </div>
      )}
    </footer>
  );
}