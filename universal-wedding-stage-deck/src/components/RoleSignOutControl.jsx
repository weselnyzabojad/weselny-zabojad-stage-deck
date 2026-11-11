import { useI18n } from '../i18n/useI18n';
import { DESKTOP_SURFACE, DESKTOP_SURFACE_HOVER } from '../lib/topBarStyles.js';

// Shared PIN / role sign-out control for role views that show the authenticated
// identity. In production it displays the authenticated role; in local/demo
// mode it displays the room PIN and forgets the pairing.
export default function RoleSignOutControl({
  isProduction = false,
  role = 'mc',
  pin = null,
  onSignOut,
  className = '',
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onSignOut}
      title={isProduction ? t('mc.title.signOut') : t('mc.title.forgetPin')}
      className={`inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted ${DESKTOP_SURFACE} ${DESKTOP_SURFACE_HOVER} hover:text-ink ${className}`}
    >
      {isProduction ? (
        <>
          ROLE: <strong className="ml-1">{String(role).toUpperCase()}</strong>
          <span className="ml-1 text-sm">🔐</span>
        </>
      ) : (
        <>
          PIN: <strong className="ml-1">{pin}</strong>
          <span className="ml-1 text-sm">🔓</span>
        </>
      )}
    </button>
  );
}
