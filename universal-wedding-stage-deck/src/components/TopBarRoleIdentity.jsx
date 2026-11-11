import { roleShort } from '../lib/roles.js';
import { useI18n } from '../i18n/useI18n';

// Static, non-clickable role element for companion views. The role is fixed by
// the join token/device choice, so there is no role-switching control here.
export default function TopBarRoleIdentity({ role = 'mc', tier = null, className = '' }) {
  const { t } = useI18n();
  // Photographer 1 and 2 keep distinct ids internally but share a number-free
  // top-bar label; auth, join cards, PINs and pocket badges keep the real ids.
  const topBarRole = role === 'photo1' || role === 'photo2' ? 'photo' : role;
  const short =
    role === 'dj'
      ? String(tier).toUpperCase() === 'VIP'
        ? 'DJ VIP'
        : 'DJ'
      : roleShort(topBarRole);

  return (
    <span
      title={t('roles.fixed')}
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-raised/50 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink shadow-sm backdrop-blur-sm ${className}`}
    >
      {t('roles.role', { short })}
      <span aria-hidden="true" className="shrink-0 text-sm leading-none">
        🔒
      </span>
    </span>
  );
}
