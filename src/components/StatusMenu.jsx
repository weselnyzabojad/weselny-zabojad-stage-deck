import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/useI18n';

// Shared secondary-actions menu (issue #1022). Keeps the header compact while
// preserving keyboard access, Escape/outside dismissal and focus return.
export default function StatusMenu({ children, active = false, className = '' }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 font-heading text-[10px] font-semibold uppercase tracking-widest transition ${
          open
            ? 'border-brand-strong bg-brand/30 text-ink'
            : 'border-line-strong bg-raised text-ink hover:bg-line'
        }`}
      >
        {t('statusMenu.label')}
        <span aria-hidden="true" className="text-[9px]">
          ▾
        </span>
        {active ? (
          <span
            aria-label={t('statusMenu.activeAlert')}
            className="h-1.5 w-1.5 rounded-full bg-amber-400"
          />
        ) : null}
      </button>
      <div
        role="menu"
        aria-label={t('statusMenu.label')}
        hidden={!open}
        className="absolute right-0 z-toast mt-2 w-[min(92vw,22rem)] space-y-2 rounded-xl border border-line bg-card p-3 shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}
