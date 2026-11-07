import { useEffect, useRef } from 'react';

const SIZES = {
  full: 'w-full h-full sm:h-[calc(100dvh-2rem)] sm:max-w-6xl rounded-none sm:rounded-2xl',
  panel: 'w-full max-w-2xl max-h-[calc(100dvh-1rem)] rounded-none sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl'
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Shared dialog shell: backdrop dismiss, Escape to close, Tab/Shift+Tab focus
// trap, initial focus on the close button, and focus restored on unmount.
export default function ModalShell({ open, onClose, labelledBy, size = 'panel', children }) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
        (element) => element instanceof HTMLElement && element.getClientRects().length > 0,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === dialog || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || active === dialog || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative flex flex-col overflow-hidden border border-line bg-page shadow-2xl ${SIZES[size] ?? SIZES.panel}`}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close overlay"
          className="absolute right-3 top-3 z-20 h-10 w-10 rounded-lg border border-line-strong bg-raised text-lg font-bold text-slate-200 transition hover:bg-line"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
