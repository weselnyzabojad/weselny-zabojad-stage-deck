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
  return (
    <button
      type="button"
      onClick={onSignOut}
      title={
        isProduction
          ? 'Sign out of this role'
          : 'Paired room PIN — click to forget this device'
      }
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
