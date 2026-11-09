import { ROLES, roleLabel } from '../lib/roles.js';

// Static role label for the top-left. It never changes the role; MC uses the
// separate RoleSwitcher. DJ labels carry the service tier decided in the top-bar
// matrix.
export default function TopBarRoleLabel({ role = 'mc', tier = null, className = '' }) {
  const icon = ROLES[role]?.icon ?? ROLES.mc.icon;
  const label =
    role === 'dj'
      ? String(tier).toUpperCase() === 'VIP'
        ? 'DJ VIP'
        : 'DJ'
      : roleLabel(role);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border border-line-strong bg-raised px-2.5 py-1 font-heading text-xs font-semibold text-ink ${className}`}
    >
      <span aria-hidden="true" className="shrink-0 text-base leading-none">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
