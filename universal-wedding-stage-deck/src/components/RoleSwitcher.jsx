import { useEffect, useRef, useState } from 'react';
import { ROLES } from '../lib/roles';

// Compact header control that switches this device between the three role
// views. The choice is local to the device and never leaves the room.
export default function RoleSwitcher({ role, onChange, roles = ['mc', 'dj', 'pocket'] }) {
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Device role: ${current.label}. Switch role`}
        title="Switch this device's role"
        className="flex items-center gap-1.5 rounded border border-line-strong bg-raised px-2.5 py-1 text-xs text-slate-200 transition hover:border-brand-strong hover:bg-line"
      >
        <span aria-hidden="true">{current.icon}</span>
        <span>
          Role: <strong className="text-white">{current.short}</strong>
        </span>
        <span aria-hidden="true" className="text-[9px] text-slate-400">
          ▼
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Switch device role"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-card shadow-2xl"
        >
          <div className="border-b border-line px-3 py-2 font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            This device
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
                  <span className="block font-heading text-xs font-bold text-white">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">{option.blurb}</span>
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
