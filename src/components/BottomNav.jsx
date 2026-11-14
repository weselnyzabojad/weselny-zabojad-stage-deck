import SkipLink from './SkipLink';
import { useI18n } from '../i18n/useI18n';

/**
 * BottomNav — persistent bottom navigation bar for phone layouts.
 *
 * Shows only non-step chrome (the current role). Step actions live in the
 * current-step card so each phone view has exactly one Advance CTA.
 *
 * The bar is visible on small screens (via isCompact from RoleShell)
 * and hidden on wide (≥640px) layouts.
 *
 * Props from RoleShell:
 *  - role: current role string
 *  - isCompact: boolean, true when width < 640px
 */
export default function BottomNav({ role, isCompact }) {
  const { t } = useI18n();

  // Only show on compact (phone) width
  if (!isCompact) return null;

  return (
    <footer className="min-h-11 bg-card border-t border-line px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs uppercase tracking-wider">
      <SkipLink />

      <div className="flex items-center gap-2">
        <span className="text-muted font-mono">
          {t('role.' + role + '.short')} {'·'}{' '}
        </span>
        <span className="font-mono text-muted">
          {t('role.' + role + '.label')}
        </span>
      </div>
    </footer>
  );
}
