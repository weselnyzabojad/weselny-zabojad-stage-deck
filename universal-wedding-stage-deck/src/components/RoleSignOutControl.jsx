import { useI18n } from '../i18n/useI18n';

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
      className={`text-muted transition hover:text-ink ${className}`}
    >
      {isProduction ? (
        <>
          ROLE: <strong className="text-ink">{String(role).toUpperCase()}</strong>
          <span className="ml-1 text-sm">🔐</span>
        </>
      ) : (
        <>
          PIN: <strong className="text-ink">{pin}</strong>
          <span className="ml-1 text-sm">🔓</span>
        </>
      )}
    </button>
  );
}
