import { useEffect, useRef, useState } from 'react';
import { ROLES, roleBlurb, roleLabel, roleShort } from '../lib/roles';
import { useI18n } from '../i18n/useI18n';

// Compact header control that switches this device between the three role
// views. The choice is local to the device and never leaves the room.
export default function RoleSwitcher({ role, onChange, roles = ['mc', 'dj'] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = ROLES[role] ?? ROLES.mc;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const choose = (next) => {
    onChange(next);
    setOpen(false);
  };

  // Only MC Master may switch views. Companion views are read-only and locked:
  // DJ Booth (#139), Photographer (#138) and Speaker (#137).
  if (role !== 'mc') return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('roles.switchAria', { role: roleLabel(role) })}
        title={t('roles.switchTitle')}
        className="flex items-center gap-1.5 rounded border border-line-strong bg-raised px-2.5 py-1 text-xs text-slate-200 transition hover:border-brand-strong hover:bg-line"
      >
        <span aria-hidden="true">{current.icon}</span>
        <span>{t('roles.role', { short: roleShort(role) })}</span>
        <span aria-hidden="true" className="text-[9px] text-slate-400">
          ▼
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t('roles.menuAria')}
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-card shadow-2xl"
        >
          <div className="border-b border-line px-3 py-2 font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {t('roles.title')}
          </div>
          {roles.map((id) => {
            const option = ROLES[id];
            if (!option) return null;
            const active = id === role;
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(id)}
                className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition ${
                  active ? 'bg-brand/30' : 'hover:bg-raised'
                }`}
              >
                <span aria-hidden="true" className="mt-0.5 text-lg leading-none">
                  {option.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-xs font-bold text-white">
                    {roleLabel(id)}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">
                    {roleBlurb(id)}
                  </span>
                </span>
                {active ? (
                  <span aria-hidden="true" className="mt-0.5 font-mono text-xs text-emerald-400">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
