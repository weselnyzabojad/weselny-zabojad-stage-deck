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
      className={`text-slate-400 transition hover:text-white ${className}`}
    >
      {isProduction ? (
        <>
          ROLE: <strong className="text-white">{String(role).toUpperCase()}</strong>
          <span className="ml-1 text-[10px]">🔐</span>
        </>
      ) : (
        <>
          PIN: <strong className="text-white">{pin}</strong>
          <span className="ml-1 text-[10px]">🔓</span>
        </>
      )}
    </button>
  );
}
