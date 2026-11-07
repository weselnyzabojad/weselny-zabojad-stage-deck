import { roleShort } from '../lib/roles.js';
import { useI18n } from '../i18n/useI18n';

// Static, non-clickable role element for companion views. The role is fixed by
// the join token/device choice, so there is no role-switching control here.
export default function TopBarRoleIdentity({ role = 'mc', tier = null, className = '' }) {
  const { t } = useI18n();
  const short =
    role === 'dj'
      ? `DJ ${String(tier).toUpperCase() === 'VIP' ? 'VIP' : 'Standard'}`
      : roleShort(role);

  return (
    <span
      title={t('roles.fixed')}
      className={`inline-flex items-center gap-1 rounded border border-line bg-raised/60 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-300 ${className}`}
    >
      {t('roles.role', { short })}
      <span aria-hidden="true" className="text-[10px]">
        🔒
      </span>
    </span>
  );
}
