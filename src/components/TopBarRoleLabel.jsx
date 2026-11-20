import { ROLES, roleLabel } from '../lib/roles.js';
import { resolveDjIdentityId } from '../lib/importantSongs.js';
import { vipDjById } from '../lib/vipDjs.js';

// Static role label for the top-left. It never changes the role; MC uses the
// separate RoleSwitcher. DJ labels use the assigned provider identity, never a
// generic VIP label in production.
export default function TopBarRoleLabel({ role = 'mc', _tier = null, wedding = null, className = '' }) {
  const icon = ROLES[role]?.icon ?? ROLES.mc.icon;
  const provider = role === 'dj' ? vipDjById(resolveDjIdentityId(wedding)) : null;
  const label = role === 'dj' ? provider?.displayName ?? 'DJ' : roleLabel(role);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-raised/35 px-3 py-1 font-heading text-xs font-semibold text-ink ${className}`}
    >
      <span aria-hidden="true" className="shrink-0 text-base leading-none">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
