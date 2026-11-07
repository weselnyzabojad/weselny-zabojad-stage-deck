import { isMediaRole } from '../lib/roles.js';
import { useI18n } from '../i18n/useI18n';

// Global, read-only reminder for roles that work the floor with children.
export default function ChildrenExpectedBadge({
  wedding,
  role,
  inline = false,
  allowMc = false,
}) {
  const { t } = useI18n();
  if (wedding?.childrenExpected !== true) return null;
  if (!isMediaRole(role) && !(allowMc && role === 'mc')) return null;

  return (
    <div
      role="status"
      className={
        inline
          ? 'inline-flex items-center gap-1.5 rounded-lg border border-amber-600 bg-amber-950/95 px-2.5 py-1 text-[10px] font-semibold text-amber-100'
          : 'fixed bottom-3 right-3 z-[80] flex items-center gap-2 rounded-lg border border-amber-600 bg-amber-950/95 px-3 py-2 text-xs font-semibold text-amber-100 shadow-2xl'
      }
    >
      <span aria-hidden="true" className="text-base">🧒</span>
      <span>{t('children.expectedBadge')}</span>
    </div>
  );
}
